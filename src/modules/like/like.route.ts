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

// PUT 요청 /posts/:postId/likes/me (좋아요 등록)
likeRouter.put(
  "/:postId/likes/me",
  authMiddleware,
  validate({ params: likePostParamsSchema }),
  asyncHandler(likeController.likePost)
);

// DELETE 요청 /posts/:postId/likes/me (좋아요 취소)
likeRouter.delete(
  "/:postId/likes/me",
  authMiddleware,
  validate({ params: likePostParamsSchema }),
  asyncHandler(likeController.unlikePost)
);
