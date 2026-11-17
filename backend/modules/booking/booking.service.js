import { bookingRepository } from "./booking.repository.js";
import { getPrismaClient } from "../../infrastructure/database/prisma.js";
import { config } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function listUserBookings(userId, pagination) {
  const [data, total] = await Promise.all([bookingRepository.listForUser(userId, pagination), bookingRepository.countForUser(userId)]);
  return { data, meta: { page: pagination.page, pageSize: pagination.pageSize, total, totalPages: Math.ceil(total / pagination.pageSize) } };
}

export async function listAdministrativeBookings(pagination) {
  const [data, total] = await Promise.all([bookingRepository.listAll(pagination), bookingRepository.countAll()]);
  return { data, meta: { page: pagination.page, pageSize: pagination.pageSize, total, totalPages: Math.ceil(total / pagination.pageSize) } };
}

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");

export async function createSeatHold(userId, { showtimeId, seatIds, idempotencyKey }) {
  if (!isUuid(showtimeId) || !Array.isArray(seatIds) || seatIds.length < 1 || seatIds.length > 8 || seatIds.some((id) => !isUuid(id)) || new Set(seatIds).size !== seatIds.length) {
    throw new AppError(400, "INVALID_HOLD", "Provide a showtime UUID and 1–8 unique seat UUIDs");
  }
  if (typeof idempotencyKey !== "string" || idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    throw new AppError(400, "IDEMPOTENCY_KEY_REQUIRED", "A 16–128 character Idempotency-Key is required");
  }
  const prisma = getPrismaClient();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.reservationTtlSeconds * 1000);
  try {
    return await prisma.$transaction(async (tx) => {
      const prior = await tx.booking.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey } }, include: { seats: true } });
      if (prior) {
        const previous = prior.seats.map((seat) => seat.seatId).sort();
        if (prior.showtimeId !== showtimeId || JSON.stringify(previous) !== JSON.stringify([...seatIds].sort())) {
          throw new AppError(409, "IDEMPOTENCY_CONFLICT", "Idempotency key was already used for a different booking request");
        }
        return prior;
      }

      await tx.seatReservation.updateMany({ where: { showtimeId, status: "HELD", expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
      await tx.booking.updateMany({ where: { showtimeId, status: "PENDING_PAYMENT", expiresAt: { lte: now } }, data: { status: "EXPIRED" } });

      const showtime = await tx.showtime.findUnique({
        where: { id: showtimeId },
        include: { movie: true, screen: { include: { cinema: true, seats: { where: { id: { in: seatIds } } } } } },
      });
      if (!showtime || showtime.startsAt <= now) throw new AppError(404, "SHOWTIME_NOT_AVAILABLE", "Showtime is unavailable");
      if (showtime.screen.seats.length !== seatIds.length) throw new AppError(400, "INVALID_SEAT", "One or more seats do not belong to this screen");

      const booking = await tx.booking.create({
        data: {
          userId, movieId: showtime.movieId, cinemaId: showtime.screen.cinemaId, showtimeId,
          idempotencyKey, status: "PENDING_PAYMENT", movieTitleSnapshot: showtime.movie.title,
          cinemaNameSnapshot: showtime.screen.cinema.name, totalAmount: showtime.basePrice.mul(seatIds.length),
          currency: showtime.currency, expiresAt,
          seats: { create: showtime.screen.seats.map((seat) => ({
            seatId: seat.id, seatLabelSnapshot: `${seat.rowLabel}${seat.seatNumber}`, unitPrice: showtime.basePrice,
          })) },
        },
        include: { seats: true, showtime: { include: { movie: true, screen: { include: { cinema: true } } } } },
      });
      await tx.seatReservation.createMany({
        data: seatIds.map((seatId) => ({ showtimeId, seatId, bookingId: booking.id, status: "HELD", expiresAt })),
      });
      return booking;
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.code === "P2002" || error.code === "P2034") throw new AppError(409, "SEAT_UNAVAILABLE", "One or more seats were just reserved by another customer");
    throw error;
  }
}

export async function getUserBooking(userId, bookingId) {
  if (!isUuid(bookingId)) throw new AppError(400, "INVALID_BOOKING_ID", "Booking ID must be a UUID");
  const booking = await bookingRepository.findByIdForUser(bookingId, userId);
  if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking was not found");
  return booking;
}

export async function cancelPendingBooking(userId, bookingId) {
  if (!isUuid(bookingId)) throw new AppError(400, "INVALID_BOOKING_ID", "Booking ID must be a UUID");
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({ where: { id: bookingId, userId } });
    if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking was not found");
    if (booking.status !== "PENDING_PAYMENT") throw new AppError(409, "BOOKING_NOT_CANCELLABLE", "Only pending bookings can be cancelled");
    await tx.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
    await tx.seatReservation.updateMany({ where: { bookingId, status: "HELD" }, data: { status: "RELEASED" } });
    return { id: bookingId, status: "CANCELLED" };
  }, { isolationLevel: "Serializable" });
}

export async function expirePendingReservations() {
  const prisma = getPrismaClient();
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const expired = await tx.booking.findMany({ where: { status: "PENDING_PAYMENT", expiresAt: { lte: now } }, select: { id: true } });
    if (!expired.length) return 0;
    const ids = expired.map(({ id }) => id);
    await tx.seatReservation.updateMany({ where: { bookingId: { in: ids }, status: "HELD" }, data: { status: "EXPIRED" } });
    const result = await tx.booking.updateMany({ where: { id: { in: ids }, status: "PENDING_PAYMENT" }, data: { status: "EXPIRED" } });
    return result.count;
  });
}
