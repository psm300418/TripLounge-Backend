import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { commentController } from "./comment.controller.js";
import {
  commentListQuerySchema,
  commentParamsSchema,
  createCommentSchema,
  postCommentParamsSchema,
  updateCommentSchema,
} from "./comment.schema.js";

export const commentRouter = Router();

// 댓글 조회
commentRouter.get(
  "/posts/:postId/comments",
  authMiddleware,
  validate({ params: postCommentParamsSchema, query: commentListQuerySchema }),
  asyncHandler(commentController.getComments)
);

// 최상위 댓글의 대댓글 목록
commentRouter.get(
  "/comments/:commentId/replies",
  authMiddleware,
  validate({ params: commentParamsSchema, query: commentListQuerySchema }),
  asyncHandler(commentController.getReplies)
);

// 댓글 작성
commentRouter.post(
  "/posts/:postId/comments",
  authMiddleware,
  validate({ params: postCommentParamsSchema, body: createCommentSchema }),
  asyncHandler(commentController.createComment)
);

// 댓글 수정
commentRouter.patch(
  "/comments/:commentId",
  authMiddleware,
  validate({ params: commentParamsSchema, body: updateCommentSchema }),
  asyncHandler(commentController.updateComment)
);

// 댓글 삭제
commentRouter.delete(
  "/comments/:commentId",
  authMiddleware,
  validate({ params: commentParamsSchema }),
  asyncHandler(commentController.deleteComment)
);
