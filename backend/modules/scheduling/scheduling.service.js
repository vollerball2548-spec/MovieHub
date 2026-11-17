import { schedulingRepository } from "./scheduling.repository.js";
import { getPrismaClient } from "../../infrastructure/database/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");

export async function listShowtimes({ movieId, cinemaId, date }) {
  if (!isUuid(movieId)) throw new AppError(400, "INVALID_MOVIE_ID", "movieId must be a UUID");
  if (cinemaId && !isUuid(cinemaId)) throw new AppError(400, "INVALID_CINEMA_ID", "cinemaId must be a UUID");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) throw new AppError(400, "INVALID_DATE", "date must use YYYY-MM-DD format");
  const startsAt = new Date(`${date}T00:00:00+07:00`);
  const endsAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000);
  if (Number.isNaN(startsAt.getTime())) throw new AppError(400, "INVALID_DATE", "date is invalid");
  return schedulingRepository.list({ movieId, cinemaId, startsAt, endsAt });
}

export async function getSeatAvailability(showtimeId) {
  if (!isUuid(showtimeId)) throw new AppError(400, "INVALID_SHOWTIME_ID", "Showtime ID must be a UUID");
  const prisma = getPrismaClient();
  const showtime = await schedulingRepository.findWithSeats(showtimeId);
  if (!showtime) throw new AppError(404, "SHOWTIME_NOT_FOUND", "Showtime was not found");
  await prisma.seatReservation.updateMany({
    where: { showtimeId, status: "HELD", expiresAt: { lte: new Date() } },
    data: { status: "EXPIRED" },
  });
  const reservations = await prisma.seatReservation.findMany({ where: { showtimeId, status: { in: ["HELD", "CONFIRMED"] }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, select: { seatId: true, status: true } });
  return {
    showtime,
    seats: showtime.screen.seats.map((seat) => ({
      id: seat.id, rowLabel: seat.rowLabel, seatNumber: seat.seatNumber, seatType: seat.seatType,
      status: reservations.find((reservation) => reservation.seatId === seat.id)?.status || "AVAILABLE",
    })),
  };
}

export async function createShowtime({ movieId, screenId, startsAt, endsAt, basePrice, currency = "THB" }) {
  if (!isUuid(movieId) || !isUuid(screenId)) throw new AppError(400, "VALIDATION_ERROR", "movieId and screenId must be UUIDs");
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const price = Number(basePrice);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new AppError(400, "INVALID_INTERVAL", "A valid showtime interval is required");
  if (!Number.isFinite(price) || price < 0 || Math.round(price * 100) !== price * 100) throw new AppError(400, "INVALID_PRICE", "basePrice must be a nonnegative amount with at most two decimals");
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (tx) => {
      const screen = await tx.screen.findUnique({ where: { id: screenId }, select: { id: true } });
      const movie = await tx.movie.findUnique({ where: { id: movieId }, select: { id: true } });
      if (!screen || !movie) throw new AppError(404, "MOVIE_OR_SCREEN_NOT_FOUND", "Movie or screen was not found");
      const collision = await tx.showtime.findFirst({ where: { screenId, startsAt: { lt: end }, endsAt: { gt: start } }, select: { id: true } });
      if (collision) throw new AppError(409, "SHOWTIME_OVERLAP", "This screen already has an overlapping showtime");
      return tx.showtime.create({ data: { movieId, screenId, startsAt: start, endsAt: end, basePrice: price, currency } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error.code === "P2002" || error.code === "P2034") throw new AppError(409, "SHOWTIME_CONFLICT", "Could not schedule this overlapping showtime");
    throw error;
  }
}
