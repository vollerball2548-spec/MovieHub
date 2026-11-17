import { Router } from "express";
import { login, logout, refresh, register } from "./auth.controller.js";
import { rateLimit } from "../../shared/middleware/rate-limit.js";
import { AppError } from "../../shared/errors/app-error.js";
import { requireTrustedOrigin } from "../../shared/middleware/trusted-origin.js";

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10 });

function requireObjectBody(req, res, next) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return next(new AppError(400, "VALIDATION_ERROR", "Request body must be a JSON object"));
  }
  next();
}

router.post("/register", authLimiter, requireTrustedOrigin, requireObjectBody, register);
router.post("/login", authLimiter, requireTrustedOrigin, requireObjectBody, login);
router.post("/refresh", requireTrustedOrigin, refresh);
router.post("/logout", requireTrustedOrigin, logout);

export default router;
