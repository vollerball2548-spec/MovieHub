import { Router, raw } from "express";
import { authenticate, requireRole } from "../../shared/middleware/authenticate.js";
import { AppError } from "../../shared/errors/app-error.js";
import { getPurchaseProof, getPurchaseQr, listMyMoviePurchases, listReviewQueue, reviewMoviePurchase, startMoviePurchase, submitPaymentProof } from "./purchase.service.js";

const router = Router();
router.use(authenticate);
const admin = requireRole("admin");

router.get("/mine", async (req, res) => res.json({ data: await listMyMoviePurchases(req.user.id) }));
router.get("/:purchaseId/qr", async (req, res) => {
  res.set("Cache-Control", "private, no-store").json({ data: await getPurchaseQr(req.user.id, req.params.purchaseId) });
});
router.post("/", async (req, res) => {
  if (typeof req.body?.movieId !== "string") throw new AppError(400, "VALIDATION_ERROR", "movieId is required");
  res.status(201).json({ data: await startMoviePurchase(req.user.id, req.body.movieId) });
});
router.post("/:purchaseId/proof", raw({ type: ["image/jpeg", "image/png"], limit: "5mb" }), async (req, res) => {
  const mime = req.get("Content-Type")?.split(";")[0]?.toLowerCase();
  res.status(202).json({ data: await submitPaymentProof(req.user.id, req.params.purchaseId, mime, req.body) });
});
router.get("/admin/review-queue", admin, async (req, res) => res.json({ data: await listReviewQueue() }));
router.get("/admin/:purchaseId/proof", admin, async (req, res) => {
  const proof = await getPurchaseProof(req.params.purchaseId);
  res.set("Content-Type", proof.proofMimeType).set("Cache-Control", "private, no-store").send(proof.proofBytes);
});
router.post("/admin/:purchaseId/review", admin, async (req, res) => {
  res.json({ data: await reviewMoviePurchase(req.user.id, req.params.purchaseId, req.body?.decision, req.body?.note) });
});

export default router;
