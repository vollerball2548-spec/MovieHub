import { Router } from "express";
import { getCinemaById, getCinemas, postCinema, postScreen } from "./cinema.controller.js";
import { authenticate, requireRole } from "../../shared/middleware/authenticate.js";
import { AppError } from "../../shared/errors/app-error.js";

const router = Router();

function requireBody(req, res, next) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return next(new AppError(400, "VALIDATION_ERROR", "Request body must be an object"));
  next();
}

router.get("/", getCinemas);
router.get("/:cinemaId", getCinemaById);
router.post("/", authenticate, requireRole("admin"), requireBody, postCinema);
router.post("/:cinemaId/screens", authenticate, requireRole("admin"), requireBody, postScreen);

export default router;
