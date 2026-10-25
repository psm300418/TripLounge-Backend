import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { likeController } from "./like.controller.js";
import { likePostParamsSchema } from "./like.schema.js";

export const likeRouter = Router();

likeRouter.get(
  "/:postId/likes",
  authMiddleware,
  validate({ params: likePostParamsSchema }),
  asyncHandler(likeController.getLikeSummary)
);

// PUT /posts/:postId/likes/me는 좋아요 등록 경로임.
likeRouter.put(
  "/:postId/likes/me",
  authMiddleware,
  validate({ params: likePostParamsSchema }),
  asyncHandler(likeController.likePost)
);

// DELETE /posts/:postId/likes/me는 좋아요 취소 경로임.
likeRouter.delete(
  "/:postId/likes/me",
  authMiddleware,
  validate({ params: likePostParamsSchema }),
  asyncHandler(likeController.unlikePost)
);
