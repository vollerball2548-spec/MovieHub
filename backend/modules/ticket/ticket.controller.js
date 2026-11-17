import { getTicketForOwner, redeemTicket } from "../payment/payment.service.js";

export async function getBookingTicket(req, res) {
  const data = await getTicketForOwner(req.user.id, req.params.bookingId);
  res.json({ data, meta: { requestId: req.id } });
}

export async function postRedeemTicket(req, res) {
  res.json({ data: await redeemTicket(req.body?.token, req.user.id), meta: { requestId: req.id } });
}
