import type { Request, Response } from "express";
import { getAuth } from "../../utils/context.js";
import { commentService } from "./comment.service.js";
import type {
  CommentListQuery,
  CreateCommentInput,
  UpdateCommentInput,
} from "./comment.schema.js";

export class CommentController {
  // 게시글 댓글 목록 조회
  getComments = async (_req: Request, res: Response): Promise<void> => {
    const { postId } = res.locals.params as { postId: number };
    const query = res.locals.query as CommentListQuery;
    const { supabase: userClient } = getAuth(res);

    const comments = await commentService.getComments(postId, query, userClient);
    res.status(200).json({ success: true, data: comments });
  };

  // 댓글 작성
  createComment = async (req: Request, res: Response): Promise<void> => {
    const { postId } = res.locals.params as { postId: number };
    const { content } = req.body as CreateCommentInput;
    const { userId, supabase: userClient } = getAuth(res);

    const comment = await commentService.createComment(postId, userId, content, userClient);
    res.status(201).json({ success: true, data: comment });
  };

  // 댓글 수정
  updateComment = async (req: Request, res: Response): Promise<void> => {
    const { commentId } = res.locals.params as { commentId: number };
    const { content } = req.body as UpdateCommentInput;
    const { userId, supabase: userClient } = getAuth(res);

    const comment = await commentService.updateComment(commentId, userId, content, userClient);
    res.status(200).json({ success: true, data: comment });
  };

  // 댓글 삭제
  deleteComment = async (_req: Request, res: Response): Promise<void> => {
    const { commentId } = res.locals.params as { commentId: number };
    const { userId, supabase: userClient } = getAuth(res);

    await commentService.deleteComment(commentId, userId, userClient);
    res.status(204).end();
  };
}

export const commentController = new CommentController();
