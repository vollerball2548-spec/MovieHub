import { AppError } from "../errors/app-error.js";

export function rateLimit({ windowMs = 60_000, max = 60, key = (req) => req.ip } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    if (hits.size > 10_000) {
      for (const [entryKey, entry] of hits) if (entry.resetAt <= now) hits.delete(entryKey);
    }
    const id = key(req);
    const record = hits.get(id);
    if (!record || record.resetAt <= now) {
      hits.set(id, { count: 1, resetAt: now + windowMs });
      return next();
    }
    record.count += 1;
    res.set("RateLimit-Limit", String(max));
    res.set("RateLimit-Remaining", String(Math.max(0, max - record.count)));
    res.set("RateLimit-Reset", String(Math.ceil(record.resetAt / 1000)));
    if (record.count > max) {
      return next(new AppError(429, "RATE_LIMITED", "Too many requests. Try again later."));
    }
    next();
  };
}
