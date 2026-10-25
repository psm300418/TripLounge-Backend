import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorMiddleware, AppError } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/notFound.middleware.js";
import { authRouter } from "./modules/auth/auth.route.js";
export const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  // CORS만으로 막을 수 없는 외부 출처 요청의 실행을 차단하는 검사임.
  if (req.headers.origin && req.headers.origin !== env.clientOrigin) {
    next(new AppError(403, "FORBIDDEN", "허용되지 않은 요청 출처입니다.")); return;
  }
  next();
});
app.get("/health", (_req, res) => { res.json({ success: true, data: { status: "ok" } }); });
app.use("/auth", authRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
