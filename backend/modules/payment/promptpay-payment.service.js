import { createHash } from "node:crypto";
import { getPrismaClient } from "../../infrastructure/database/prisma.js";
import { config } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";
import { buildPromptPayPayload, detectImageType } from "./promptpay.js";
import { settlePaymentInTransaction } from "./payment.service.js";

const prisma = () => getPrismaClient();
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
export const PROMPTPAY_PROVIDER = "PROMPTPAY";
const PROMPTPAY_RESERVATION_TTL_MS = 2 * 60 * 60 * 1000;

function assertSlipImage(mimeType, bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 12 || bytes.length > 5 * 1024 * 1024) {
    throw new AppError(400, "INVALID_PROOF", "Payment proof must be a 12-byte to 5 MB JPEG or PNG image");
  }
  const detected = detectImageType(bytes);
  if (!detected) throw new AppError(415, "UNSUPPORTED_PROOF", "Only genuine PNG and JPEG image files are accepted");
  if (mimeType && mimeType !== detected) {
    throw new AppError(415, "UNSUPPORTED_PROOF", "The declared Content-Type does not match the image bytes");
  }
  return detected;
}

/**
 * Creates (or resumes) a manual PromptPay payment for a pending booking and
 * returns an amount-bearing QR payload. The reservation is extended to two
 * hours so the customer can transfer and an administrator can review the slip.
 */
export async function createPromptPayCheckout(userId, bookingId) {
  if (!isUuid(bookingId)) throw new AppError(400, "INVALID_BOOKING_ID", "Booking ID must be a UUID");
  const client = prisma();
  const booking = await client.booking.findFirst({ where: { id: bookingId, userId } });
  if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking was not found");
  if (booking.status !== "PENDING_PAYMENT" || !booking.expiresAt || booking.expiresAt <= new Date()) {
    throw new AppError(409, "BOOKING_EXPIRED", "This reservation has expired or is no longer payable");
  }

  const expiresAt = new Date(Date.now() + PROMPTPAY_RESERVATION_TTL_MS);
  await client.$transaction(async (tx) => {
    await tx.booking.updateMany({ where: { id: booking.id, status: "PENDING_PAYMENT" }, data: { expiresAt } });
    await tx.seatReservation.updateMany({ where: { bookingId: booking.id, status: "HELD" }, data: { expiresAt } });
  });

  let payment = await client.payment.findFirst({
    where: { bookingId, provider: PROMPTPAY_PROVIDER, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: { proof: { select: { id: true, createdAt: true } } },
  });
  if (!payment) {
    payment = await client.payment.create({
      data: { bookingId, provider: PROMPTPAY_PROVIDER, status: "PENDING", amount: booking.totalAmount, currency: booking.currency },
      include: { proof: { select: { id: true, createdAt: true } } },
    });
  }

  const amount = Number(booking.totalAmount);
  return {
    paymentId: payment.id,
    provider: "promptpay",
    bookingId: booking.id,
    movieTitle: booking.movieTitleSnapshot,
    amount: amount.toFixed(2),
    currency: booking.currency,
    promptPayId: config.promptPayId,
    reference: `BK${booking.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`,
    payload: buildPromptPayPayload({ promptPayId: config.promptPayId, amount }),
    expiresAt,
    status: payment.proof ? "UNDER_REVIEW" : "AWAITING_TRANSFER",
  };
}

export async function getPromptPayPayment(userId, paymentId) {
  if (!isUuid(paymentId)) throw new AppError(400, "INVALID_PAYMENT_ID", "Payment ID must be a UUID");
  const payment = await prisma().payment.findFirst({
    where: { id: paymentId, provider: PROMPTPAY_PROVIDER, booking: { userId } },
    include: { proof: { select: { id: true, createdAt: true, reviewedAt: true, note: true } }, booking: { select: { id: true, status: true } } },
  });
  if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment was not found");
  return {
    paymentId: payment.id,
    status: payment.status,
    bookingId: payment.bookingId,
    bookingStatus: payment.booking.status,
    amount: Number(payment.amount).toFixed(2),
    currency: payment.currency,
    proof: payment.proof,
  };
}

export async function submitPromptPayProof(userId, paymentId, mimeType, bytes) {
  if (!isUuid(paymentId)) throw new AppError(400, "INVALID_PAYMENT_ID", "Payment ID must be a UUID");
  const normalizedMime = assertSlipImage(mimeType, bytes);
  const client = prisma();
  const payment = await client.payment.findFirst({
    where: { id: paymentId, provider: PROMPTPAY_PROVIDER, booking: { userId } },
    include: { booking: { select: { id: true, status: true, expiresAt: true } } },
  });
  if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment was not found");
  if (payment.status !== "PENDING") throw new AppError(409, "PAYMENT_NOT_PENDING", "This payment is no longer awaiting a slip");
  if (payment.booking.status !== "PENDING_PAYMENT" || !payment.booking.expiresAt || payment.booking.expiresAt <= new Date()) {
    throw new AppError(409, "BOOKING_EXPIRED", "The reservation has expired");
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  try {
    await client.paymentProof.upsert({
      where: { paymentId },
      create: { paymentId, mimeType: normalizedMime, bytes, sha256 },
      update: { mimeType: normalizedMime, bytes, sha256, note: null, reviewedBy: null, reviewedAt: null },
    });
  } catch (error) {
    if (error.code === "P2002") throw new AppError(409, "DUPLICATE_PROOF", "This slip has already been submitted for another payment");
    throw error;
  }
  return { paymentId, bookingId: payment.bookingId, status: "UNDER_REVIEW", amount: Number(payment.amount).toFixed(2), currency: payment.currency };
}

export async function listPromptPayReviewQueue() {
  const rows = await prisma().payment.findMany({
    where: { provider: PROMPTPAY_PROVIDER, status: "PENDING", proof: { isNot: null } },
    orderBy: { createdAt: "asc" },
    include: {
      proof: { select: { id: true, mimeType: true, sha256: true, createdAt: true, note: true } },
      booking: {
        include: {
          seats: true,
          user: { select: { id: true, username: true, email: true } },
          showtime: { include: { movie: true, screen: { include: { cinema: true } } } },
        },
      },
    },
  });
  return rows.map((payment) => ({
    paymentId: payment.id,
    amount: Number(payment.amount).toFixed(2),
    currency: payment.currency,
    createdAt: payment.createdAt,
    proof: payment.proof,
    booking: {
      id: payment.booking.id,
      status: payment.booking.status,
      movieTitle: payment.booking.movieTitleSnapshot,
      cinema: payment.booking.cinemaNameSnapshot || payment.booking.showtime?.screen?.cinema?.name || null,
      startsAt: payment.booking.showtime?.startsAt || null,
      expiresAt: payment.booking.expiresAt,
      seats: payment.booking.seats.map((seat) => seat.seatLabelSnapshot),
      user: payment.booking.user,
    },
  }));
}

export async function getPromptPayProof(paymentId) {
  if (!isUuid(paymentId)) throw new AppError(400, "INVALID_PAYMENT_ID", "Payment ID must be a UUID");
  const proof = await prisma().paymentProof.findUnique({ where: { paymentId }, select: { bytes: true, mimeType: true } });
  if (!proof?.bytes) throw new AppError(404, "PROOF_NOT_FOUND", "Payment proof was not found");
  return proof;
}

/**
 * Approves or rejects a manual PromptPay slip. Approval reuses the same
 * settling transaction as mock/Stripe payments, so a ticket is only issued
 * when the reservation is still held and the amount matches.
 */
export async function reviewPromptPayPayment(adminId, paymentId, decision, note) {
  if (!isUuid(paymentId) || !["approve", "reject"].includes(decision)) {
    throw new AppError(400, "INVALID_REVIEW", "A valid payment and approve/reject decision are required");
  }
  if (note !== undefined && (typeof note !== "string" || note.length > 500)) {
    throw new AppError(400, "INVALID_NOTE", "Review note must be up to 500 characters");
  }
  return prisma().$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { proof: true, booking: { include: { seats: true } } },
    });
    if (!payment || payment.provider !== PROMPTPAY_PROVIDER || !payment.proof) {
      throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment proof was not found");
    }
    if (payment.status !== "PENDING") throw new AppError(409, "ALREADY_REVIEWED", "This payment is no longer awaiting review");

    await tx.paymentProof.update({
      where: { paymentId },
      data: { note: note?.trim() || null, reviewedBy: adminId, reviewedAt: new Date() },
    });

    if (decision === "reject") {
      await tx.payment.update({ where: { id: paymentId }, data: { status: "FAILED" } });
      await tx.auditLog.create({ data: { actorId: adminId, action: "PROMPTPAY_PAYMENT_REJECTED", entityType: "Payment", entityId: paymentId, metadata: { bookingId: payment.bookingId, amount: Number(payment.amount) } } });
      return { paymentId, status: "REJECTED", bookingId: payment.bookingId };
    }

    if (payment.booking.status !== "PENDING_PAYMENT" || !payment.booking.expiresAt || payment.booking.expiresAt <= new Date()) {
      throw new AppError(409, "BOOKING_EXPIRED", "The reservation expired before approval; reject the slip and ask the customer to rebook");
    }
    // A duplicate pending PromptPay payment can exist if two checkouts raced.
    // Only the first approved payment may settle the booking.
    const settled = await tx.payment.findFirst({
      where: { bookingId: payment.bookingId, status: "SUCCEEDED" },
      select: { id: true },
    });
    if (settled) {
      await tx.payment.update({ where: { id: paymentId }, data: { status: "FAILED" } });
      await tx.auditLog.create({ data: { actorId: adminId, action: "PROMPTPAY_DUPLICATE_REJECTED", entityType: "Payment", entityId: paymentId, metadata: { bookingId: payment.bookingId, settledPaymentId: settled.id } } });
      return { paymentId, status: "DUPLICATE", bookingId: payment.bookingId };
    }
    const result = await settlePaymentInTransaction(tx, paymentId, { amount: payment.amount, currency: payment.currency });
    await tx.auditLog.create({ data: { actorId: adminId, action: "PROMPTPAY_PAYMENT_APPROVED", entityType: "Payment", entityId: paymentId, metadata: { bookingId: payment.bookingId, amount: Number(payment.amount) } } });
    return { paymentId, ...result };
  }, { isolationLevel: "Serializable" });
}
