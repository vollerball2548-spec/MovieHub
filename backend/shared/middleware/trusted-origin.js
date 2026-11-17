import { config } from "../../config/env.js";
import { AppError } from "../errors/app-error.js";

export function requireTrustedOrigin(req, res, next) {
  const origin = req.get("origin");
  if (!origin || !config.frontendOrigins.includes(origin)) {
    return next(new AppError(403, "UNTRUSTED_ORIGIN", "A configured browser origin is required"));
  }
  next();
}
