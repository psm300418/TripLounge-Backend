import type { RequestHandler } from "express";
import { AppError } from "./error.middleware.js";

// 프로세스별 요청 제한이며 다중 서버에서는 공통 게이트웨이 제한도 필요한 설정임.
export const rateLimit = (limit: number, windowMs: number, byUser = false): RequestHandler => {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const now = Date.now();
    const user = res.locals.auth as { userId: string } | undefined;
    const key = byUser && user ? user.userId : req.ip ?? "unknown";
    // 접속자 증가에 따른 메모리 사용량을 제한하는 처리임.
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
