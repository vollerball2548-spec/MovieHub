import { Router, raw } from "express";
import {
  getPromptPay,
  getPromptPayProofImage,
  getPromptPayReviewQueue,
  postCheckout,
  postMockConfirm,
  postPromptPayCheckout,
  postPromptPayProof,
  postPromptPayReview,
  postStripeWebhook,
} from "./payment.controller.js";
import { authenticate, requireRole } from "../../shared/middleware/authenticate.js";
import { AppError } from "../../shared/errors/app-error.js";

const router = Router();
const validateObject = (req, res, next) => req.body && typeof req.body === "object" && !Array.isArray(req.body)
  ? next()
  : next(new AppError(400, "VALIDATION_ERROR", "Request body must be an object"));

router.post("/checkout", authenticate, validateObject, postCheckout);
router.post("/mock/:paymentId/confirm", authenticate, postMockConfirm);
router.post("/webhooks/stripe", postStripeWebhook);

// Manual PromptPay: create an amount-bearing QR, then upload a transfer slip.
router.post("/promptpay/checkout", authenticate, validateObject, postPromptPayCheckout);
router.get("/promptpay/:paymentId", authenticate, getPromptPay);
router.post("/promptpay/:paymentId/proof", authenticate, raw({ type: ["image/jpeg", "image/png"], limit: "5mb" }), postPromptPayProof);

// Administrator review of PromptPay slips.
router.get("/admin/promptpay/review-queue", authenticate, requireRole("admin"), getPromptPayReviewQueue);
router.get("/admin/promptpay/:paymentId/proof", authenticate, requireRole("admin"), getPromptPayProofImage);
router.post("/admin/promptpay/:paymentId/review", authenticate, requireRole("admin"), validateObject, postPromptPayReview);

export default router;
