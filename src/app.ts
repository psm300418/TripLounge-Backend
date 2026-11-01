import cors from "cors";
import express from "express";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { errorMiddleware, AppError } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/notFound.middleware.js";
import { authMiddleware } from "./middlewares/auth.middleware.js";
import { authRouter } from "./modules/auth/auth.route.js";
import { postRouter } from "./modules/post/post.route.js";
import { likeRouter } from "./modules/like/like.route.js";
import { feedRouter } from "./modules/home-feed/feed/feed.route.js";
import { notificationRouter } from "./modules/home-feed/notification/notification.route.js";
export const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: env.nodeEnv === "development" ? true : env.clientOrigin, credentials: true }));
app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  // CORS만으로 막을 수 없는 외부 출처 요청의 실행을 차단하는 검사
  if (env.nodeEnv === "production" && req.headers.origin && req.headers.origin !== env.clientOrigin) {
    next(new AppError(403, "FORBIDDEN", "허용되지 않은 요청 출처입니다.")); return;
  }
  next();
});

app.get("/health", (_req, res) => { res.json({ success: true, data: { status: "ok" } }); });
const serveTestFile = (fileName: string) => (_req: express.Request, res: express.Response) => {
  if (env.nodeEnv !== "development") { res.status(404).end(); return; }
  res.sendFile(fileURLToPath(new URL(`../${fileName}`, import.meta.url)));
};
app.get("/test", serveTestFile("test.html"));
app.get("/test.css", serveTestFile("test.css"));
app.get("/test.js", serveTestFile("test.js"));
app.use("/auth", authRouter);
app.get("/auth/callback", serveTestFile("test.html"));
app.use("/posts", postRouter);
app.use("/posts", likeRouter);
app.use("/posts", authMiddleware, feedRouter);
app.use("/notifications", authMiddleware, notificationRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
