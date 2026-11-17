import { cancelPendingBooking, createSeatHold, getUserBooking, listAdministrativeBookings, listUserBookings } from "./booking.service.js";

function respond(req, res, result) {
  result.meta.requestId = req.id;
  if (req.baseUrl.startsWith("/api/v1/")) return res.json(result);
  res.json(result.data.map((booking) => ({
    _id: booking.id,
    userId: booking.userId,
    movieTitle: booking.movieTitleSnapshot,
    cinema: booking.cinemaNameSnapshot || booking.showtime?.screen?.cinema?.name || "ไม่ระบุ",
    date: booking.legacyDateSnapshot || (booking.showtime ? booking.showtime.startsAt.toLocaleDateString("th-TH") : "ไม่ระบุ"),
    time: booking.legacyTimeSnapshot || (booking.showtime ? booking.showtime.startsAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "ไม่ระบุ"),
    seats: booking.seats.map((seat) => seat.seatLabelSnapshot),
    totalPrice: Number(booking.totalAmount),
    createdAt: booking.createdAt,
    status: booking.status,
    qrCode: null,
  })));
}

export async function getMyBookings(req, res) {
  respond(req, res, await listUserBookings(req.user.id, req.pagination));
}

export async function getAllBookings(req, res) {
  respond(req, res, await listAdministrativeBookings(req.pagination));
}

export async function postHold(req, res) {
  const booking = await createSeatHold(req.user.id, {
    showtimeId: req.body.showtimeId,
    seatIds: req.body.seatIds,
    idempotencyKey: req.get("Idempotency-Key"),
  });
  res.status(201).json({ data: booking, meta: { requestId: req.id } });
}

export async function getBooking(req, res) {
  res.json({ data: await getUserBooking(req.user.id, req.params.bookingId), meta: { requestId: req.id } });
}

export async function cancelBooking(req, res) {
  res.json({ data: await cancelPendingBooking(req.user.id, req.params.bookingId), meta: { requestId: req.id } });
}
