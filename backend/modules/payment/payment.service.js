import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { getPrismaClient } from "../../infrastructure/database/prisma.js";
import { config } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";

const prisma = () => getPrismaClient();
const tokenForTicket = (id) => `${id}.${createHmac("sha256", config.jwtSecret).update(`ticket:${id}`).digest("base64url")}`;
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const hashPayload = (payload) => createHash("sha256").update(payload).digest("hex");
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");

export async function createCheckout(userId, bookingId) {
  if (!isUuid(bookingId)) throw new AppError(400, "INVALID_BOOKING_ID", "Booking ID must be a UUID");
  const booking = await prisma().booking.findFirst({ where: { id: bookingId, userId }, include: { seats: true, showtime: { include: { movie: true } } } });
  if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking was not found");
  if (booking.status !== "PENDING_PAYMENT" || !booking.expiresAt || booking.expiresAt <= new Date()) {
    throw new AppError(409, "BOOKING_EXPIRED", "This reservation has expired or is no longer payable");
  }

  const provider = config.paymentProvider;
  let payment = await prisma().payment.findFirst({ where: { bookingId, provider: provider.toUpperCase(), status: "PENDING" }, orderBy: { createdAt: "desc" } });
  if (payment?.providerReference) {
    if (provider === "mock") return { paymentId: payment.id, provider, checkoutUrl: `${config.appBaseUrl}/payment?bookingId=${booking.id}&paymentId=${payment.id}&mock=1`, expiresAt: booking.expiresAt };
    const existingResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${payment.providerReference}`, { headers: { Authorization: `Bearer ${config.stripeSecretKey}` } });
    const existingSession = await existingResponse.json();
    if (existingResponse.ok && existingSession.url && existingSession.status === "open") return { paymentId: payment.id, provider, checkoutUrl: existingSession.url, expiresAt: booking.expiresAt };
    if (existingResponse.ok && existingSession.status === "complete") return { paymentId: payment.id, provider, status: "PROCESSING", checkoutUrl: null, expiresAt: booking.expiresAt };
    await prisma().payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
    payment = null;
  }
  if (!payment) {
    try {
      payment = await prisma().$transaction(async (tx) => {
        const concurrent = await tx.payment.findFirst({ where: { bookingId, provider: provider.toUpperCase(), status: "PENDING" }, orderBy: { createdAt: "desc" } });
        return concurrent || tx.payment.create({ data: { bookingId, provider: provider.toUpperCase(), status: "PENDING", amount: booking.totalAmount, currency: booking.currency } });
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (error.code === "P2002" || error.code === "P2034") throw new AppError(409, "CHECKOUT_IN_PROGRESS", "A checkout is already being created for this booking");
      throw error;
    }
  }

  const stripeExpiresAt = provider === "stripe" ? new Date(Date.now() + 31 * 60 * 1000) : booking.expiresAt;
  if (provider === "stripe" && !payment.providerReference) {
    const reservationExpiry = new Date(stripeExpiresAt.getTime() + 2 * 60 * 1000);
    await prisma().$transaction(async (tx) => {
      await tx.booking.updateMany({ where: { id: booking.id, status: "PENDING_PAYMENT" }, data: { expiresAt: reservationExpiry } });
      await tx.seatReservation.updateMany({ where: { bookingId: booking.id, status: "HELD", expiresAt: { gt: new Date() } }, data: { expiresAt: reservationExpiry } });
    });
  }

  if (provider === "mock") {
    const providerReference = payment.providerReference || `mock_${randomUUID()}`;
    if (!payment.providerReference) await prisma().payment.update({ where: { id: payment.id }, data: { providerReference } });
    return { paymentId: payment.id, provider, checkoutUrl: `${config.appBaseUrl}/payment?bookingId=${booking.id}&paymentId=${payment.id}&mock=1`, expiresAt: booking.expiresAt };
  }

  try {
    const form = new URLSearchParams({
      mode: "payment",
      success_url: `${config.appBaseUrl}/ticket?bookingId=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.appBaseUrl}/payment?bookingId=${booking.id}&payment=cancelled`,
      "line_items[0][price_data][currency]": booking.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(booking.totalAmount.mul(100).toNumber()),
      "line_items[0][price_data][product_data][name]": booking.movieTitleSnapshot,
      "line_items[0][quantity]": "1",
      "metadata[bookingId]": booking.id,
      expires_at: String(Math.floor(stripeExpiresAt.getTime() / 1000)),
    });
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.stripeSecretKey}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `moviehub-checkout-${payment.id}` },
      body: form,
    });
    const session = await response.json();
    if (!response.ok) throw new Error(session.error?.message || "Stripe checkout session could not be created");
    await prisma().payment.update({ where: { id: payment.id }, data: { providerReference: session.id } });
    return { paymentId: payment.id, provider, checkoutUrl: session.url, expiresAt: stripeExpiresAt };
  } catch (error) {
    await prisma().payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    throw new AppError(502, "PAYMENT_PROVIDER_ERROR", error.message || "Payment provider is unavailable");
  }
}

export async function settlePaymentInTransaction(tx, paymentId, { amount, currency }) {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { booking: { include: { seats: true } } } });
    if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment was not found");
    if (payment.status === "SUCCEEDED") return { status: "CONFIRMED", bookingId: payment.bookingId };
    if (Number(payment.amount) !== Number(amount) || payment.currency.toLowerCase() !== String(currency).toLowerCase()) {
      throw new AppError(400, "PAYMENT_AMOUNT_MISMATCH", "Payment amount or currency does not match the booking");
    }

    const booking = payment.booking;
    if (booking.status !== "PENDING_PAYMENT" || !booking.expiresAt || booking.expiresAt <= new Date()) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", paidAt: new Date() } });
      if (booking.status === "PENDING_PAYMENT") await tx.booking.update({ where: { id: booking.id }, data: { status: "REFUND_PENDING" } });
      return { status: "REFUND_PENDING", bookingId: booking.id };
    }

    const held = await tx.seatReservation.count({ where: { bookingId: booking.id, status: "HELD", expiresAt: { gt: new Date() } } });
    if (held !== booking.seats.length) throw new AppError(409, "RESERVATION_LOST", "Seat reservation expired before payment confirmation");
    await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", paidAt: new Date() } });
    await tx.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
    await tx.seatReservation.updateMany({ where: { bookingId: booking.id, status: "HELD" }, data: { status: "CONFIRMED", expiresAt: null } });

    const ticketId = randomUUID();
    const ticketToken = tokenForTicket(ticketId);
    await tx.ticket.create({ data: { id: ticketId, bookingId: booking.id, tokenHash: hashToken(ticketToken), status: "ACTIVE" } });
    return { status: "CONFIRMED", bookingId: booking.id };
}

async function settlePayment(paymentId, details) {
  return prisma().$transaction((tx) => settlePaymentInTransaction(tx, paymentId, details), { isolationLevel: "Serializable" });
}

export async function confirmMockPayment(userId, paymentId) {
  if (config.nodeEnv === "production" || config.paymentProvider !== "mock") throw new AppError(404, "NOT_FOUND", "Mock payment is unavailable");
  const payment = await prisma().payment.findFirst({ where: { id: paymentId, provider: "MOCK", booking: { userId } } });
  if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment was not found");
  return settlePayment(payment.id, { amount: payment.amount, currency: payment.currency });
}

function verifyStripeSignature(rawBody, signatureHeader) {
  const parts = Object.fromEntries(String(signatureHeader || "").split(",").map((item) => item.split("=")));
  const timestamp = Number(parts.t);
  const signatures = String(signatureHeader || "").split(",").filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!Number.isInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300 || !signatures.length) return false;
  const expected = createHmac("sha256", config.stripeWebhookSecret).update(`${timestamp}.${rawBody}`).digest();
  return signatures.some((signature) => {
    const actual = Buffer.from(signature, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

export async function handleStripeWebhook(rawBody, signatureHeader) {
  if (!Buffer.isBuffer(rawBody) || !verifyStripeSignature(rawBody, signatureHeader)) throw new AppError(400, "INVALID_WEBHOOK_SIGNATURE", "Stripe signature verification failed");
  const event = JSON.parse(rawBody.toString("utf8"));
  try {
    return await prisma().$transaction(async (tx) => {
      await tx.paymentEvent.create({ data: { provider: "STRIPE", eventId: event.id, eventType: event.type, payloadHash: hashPayload(rawBody) } });
      const session = event.data?.object;
      if (event.type === "checkout.session.completed" && session?.payment_status === "paid") {
        const payment = await tx.payment.findFirst({ where: { provider: "STRIPE", providerReference: session.id } });
        if (!payment || session.metadata?.bookingId !== payment.bookingId) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment session is not recognized");
        const result = await settlePaymentInTransaction(tx, payment.id, { amount: Number(session.amount_total) / 100, currency: session.currency });
        await tx.paymentEvent.update({ where: { provider_eventId: { provider: "STRIPE", eventId: event.id } }, data: { processedAt: new Date() } });
        return result;
      }
      if (event.type === "checkout.session.expired" && session?.id) {
        const payment = await tx.payment.findFirst({ where: { provider: "STRIPE", providerReference: session.id } });
        if (payment?.status === "PENDING") {
          await tx.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
          await tx.booking.updateMany({ where: { id: payment.bookingId, status: "PENDING_PAYMENT" }, data: { status: "EXPIRED" } });
          await tx.seatReservation.updateMany({ where: { bookingId: payment.bookingId, status: "HELD" }, data: { status: "EXPIRED" } });
        }
      }
      await tx.paymentEvent.update({ where: { provider_eventId: { provider: "STRIPE", eventId: event.id } }, data: { processedAt: new Date() } });
      return { received: true };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error.code === "P2002") return { received: true, duplicate: true };
    throw error;
  }
}

export async function getTicketForOwner(userId, bookingId) {
  if (!isUuid(bookingId)) throw new AppError(400, "INVALID_BOOKING_ID", "Booking ID must be a UUID");
  const booking = await prisma().booking.findFirst({ where: { id: bookingId, userId, status: "CONFIRMED" }, include: { ticket: true, seats: true, showtime: { include: { movie: true, screen: { include: { cinema: true } } } } } });
  if (!booking?.ticket || booking.ticket.status !== "ACTIVE") throw new AppError(404, "TICKET_NOT_FOUND", "An active ticket was not found");
  const qrPayload = tokenForTicket(booking.ticket.id);
  return { booking, ticket: booking.ticket, qrPayload };
}

export async function redeemTicket(token, staffUserId) {
  if (typeof token !== "string") throw new AppError(400, "INVALID_TICKET", "Ticket token is required");
  const separator = token.indexOf(".");
  if (separator < 1) throw new AppError(400, "INVALID_TICKET", "Ticket token is invalid");
  const id = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = createHmac("sha256", config.jwtSecret).update(`ticket:${id}`).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new AppError(404, "INVALID_TICKET", "Ticket is invalid");
  const result = await prisma().ticket.updateMany({ where: { id, tokenHash: hashToken(token), status: "ACTIVE", booking: { status: "CONFIRMED", showtime: { startsAt: { gt: new Date(Date.now() - 4 * 60 * 60 * 1000) } } } }, data: { status: "REDEEMED", redeemedAt: new Date(), redeemedBy: staffUserId } });
  if (!result.count) throw new AppError(409, "TICKET_UNAVAILABLE", "Ticket has already been used or is invalid");
  return { status: "REDEEMED", ticketId: id };
}
