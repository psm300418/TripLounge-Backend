import type { RequestHandler } from "express";
import { AppError } from "./error.middleware.js";

// Per-process guard. A multi-instance deployment must also use a shared gateway limit.
export const rateLimit = (limit: number, windowMs: number, byUser = false): RequestHandler => {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const now = Date.now();
    const user = res.locals.auth as { userId: string } | undefined;
    const key = byUser && user ? user.userId : req.ip ?? "unknown";
    // Bound memory even when many distinct clients connect.
    if (buckets.size >= 10000) {
      for (const [entryKey, value] of buckets) if (value.resetAt <= now) buckets.delete(entryKey);
      if (buckets.size >= 10000 && !buckets.has(key)) {
        next(new AppError(429, "TOO_MANY_REQUESTS", "잠시 후 다시 시도해주세요.")); return;
      }
    }
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs }; buckets.set(key, bucket);
    }
    bucket.count++;
    if (bucket.count > limit) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      next(new AppError(429, "TOO_MANY_REQUESTS", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.")); return;
    }
    next();
  };
};
