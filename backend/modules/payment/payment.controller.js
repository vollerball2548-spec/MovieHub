import { createCheckout, confirmMockPayment, handleStripeWebhook } from "./payment.service.js";
import {
  createPromptPayCheckout,
  getPromptPayPayment,
  getPromptPayProof,
  listPromptPayReviewQueue,
  reviewPromptPayPayment,
  submitPromptPayProof,
} from "./promptpay-payment.service.js";

export async function postCheckout(req, res) {
  res.status(201).json({ data: await createCheckout(req.user.id, req.body.bookingId), meta: { requestId: req.id } });
}

export async function postMockConfirm(req, res) {
  res.json({ data: await confirmMockPayment(req.user.id, req.params.paymentId), meta: { requestId: req.id } });
}

export async function postStripeWebhook(req, res) {
  res.json(await handleStripeWebhook(req.rawBody, req.get("Stripe-Signature")));
}

export async function postPromptPayCheckout(req, res) {
  res.status(201).json({ data: await createPromptPayCheckout(req.user.id, req.body.bookingId), meta: { requestId: req.id } });
}

export async function getPromptPay(req, res) {
  res.json({ data: await getPromptPayPayment(req.user.id, req.params.paymentId), meta: { requestId: req.id } });
}

export async function postPromptPayProof(req, res) {
  const mime = req.get("Content-Type")?.split(";")[0]?.toLowerCase();
  res.status(202).json({ data: await submitPromptPayProof(req.user.id, req.params.paymentId, mime, req.body), meta: { requestId: req.id } });
}

export async function getPromptPayReviewQueue(req, res) {
  res.json({ data: await listPromptPayReviewQueue(), meta: { requestId: req.id } });
}

export async function getPromptPayProofImage(req, res) {
  const proof = await getPromptPayProof(req.params.paymentId);
  res.set("Content-Type", proof.mimeType).set("Cache-Control", "private, no-store").send(proof.bytes);
}

export async function postPromptPayReview(req, res) {
  res.json({ data: await reviewPromptPayPayment(req.user.id, req.params.paymentId, req.body?.decision, req.body?.note), meta: { requestId: req.id } });
}
