import { AppError } from "../errors/app-error.js";
import { logger } from "../logger.js";

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} was not found`,
      requestId: req.id,
    },
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const malformedJson = err?.status === 400 && err?.type === "entity.parse.failed";
  const oversizedBody = err?.status === 413 && err?.type === "entity.too.large";
  const known = err instanceof AppError;
  const status = known ? err.status : malformedJson ? 400 : oversizedBody ? 413 : 500;
  const code = known ? err.code : malformedJson ? "INVALID_JSON" : oversizedBody ? "PAYLOAD_TOO_LARGE" : "INTERNAL_SERVER_ERROR";
  const message = known ? err.message : malformedJson ? "Request body contains invalid JSON" : oversizedBody ? "Request payload exceeds the allowed size" : "An unexpected error occurred";

  if (!known) {
    logger.error("Unhandled request error", {
      requestId: req.id, method: req.method, path: req.path, error: err?.message || String(err),
    });
  }

  res.status(status).json({
    error: {
      code,
      message,
      ...(known && err.details ? { details: err.details } : {}),
      requestId: req.id,
    },
  });
}
