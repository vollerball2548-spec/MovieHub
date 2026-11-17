import { Router } from "express";
import { getSeats, getShowtimes, postShowtime } from "./scheduling.controller.js";
import { authenticate, requireRole } from "../../shared/middleware/authenticate.js";
import { AppError } from "../../shared/errors/app-error.js";

const router = Router();
function requireBody(req, res, next) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return next(new AppError(400, "VALIDATION_ERROR", "Request body must be an object"));
  next();
}

router.get("/", getShowtimes);
router.get("/:showtimeId/seats", getSeats);
router.post("/", authenticate, requireRole("admin"), requireBody, postShowtime);

export default router;
