import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorMiddleware, AppError } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/notFound.middleware.js";
import { authMiddleware } from "./middlewares/auth.middleware.js";
import { likeRouter } from "./modules/like/like.route.js";
import { feedRouter } from "./modules/home-feed/feed/feed.route.js";
import { notificationRouter } from "./modules/home-feed/notification/notification.route.js";
export const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  // CORS alone does not prevent a cross-origin request from executing.
  if (req.headers.origin && req.headers.origin !== env.clientOrigin) {
    next(new AppError(403, "FORBIDDEN", "허용되지 않은 요청 출처입니다.")); return;
  }
  next();
});
app.get("/health", (_req, res) => { res.json({ success: true, data: { status: "ok" } }); });
app.use("/posts", likeRouter);
app.use("/posts", authMiddleware, feedRouter);
app.use("/notifications", authMiddleware, notificationRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
