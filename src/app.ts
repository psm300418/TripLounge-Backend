import cors from "cors";
import express from "express";

import { errorMiddleware } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/notFound.middleware.js";
import { postRouter } from "./modules/post/post.route.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
    },
  });
});

app.use("/posts", postRouter); //게시글 라우터

app.use(notFoundMiddleware);
app.use(errorMiddleware);
