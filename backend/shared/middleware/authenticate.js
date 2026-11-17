import jwt from "jsonwebtoken";
import { config } from "../../config/env.js";
import { AppError } from "../errors/app-error.js";

export function authenticate(req, res, next) {
  const [scheme, token, extra] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token || extra) {
    return next(new AppError(401, "UNAUTHENTICATED", "A valid Bearer token is required"));
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"], issuer: config.jwtIssuer, audience: config.jwtAudience,
    });
    if (typeof decoded === "string" || !decoded.id || decoded.type !== "access") throw new Error("Invalid access token");
    req.user = { id: decoded.id, role: String(decoded.role || "user").toLowerCase() };
    req.userId = decoded.id;
    next();
  } catch {
    next(new AppError(401, "UNAUTHENTICATED", "Token is invalid or expired"));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, "FORBIDDEN", "You do not have permission to access this resource"));
    }
    next();
  };
}
