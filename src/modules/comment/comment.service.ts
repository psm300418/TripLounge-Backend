import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../middlewares/error.middleware.js";
import { commentRepository } from "./comment.repository.js";
import type { CommentListQuery, CreateCommentInput } from "./comment.schema.js";

export class CommentService {
  // 댓글 목록 조회
  async getComments(postId: number, query: CommentListQuery, client: SupabaseClient) {
    return commentRepository.findByPostId(postId, query, client);
  }

  // 최상위 댓글의 대댓글 조회
  async getReplies(commentId: number, query: CommentListQuery, client: SupabaseClient) {
    return commentRepository.findReplies(commentId, query, client);
  }

  // 댓글 작성
  async createComment(postId: number, userId: string, input: CreateCommentInput, client: SupabaseClient) {
    if (!(await commentRepository.postIsVisible(postId, client))) {
      throw new AppError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
    }

    return commentRepository.create(postId, userId, input.content, input.parentCommentId, client);
  }

  // 댓글 수정
  async updateComment(commentId: number, userId: string, content: string, client: SupabaseClient) {
    const comment = await commentRepository.update(commentId, userId, content, client);
    if (!comment) throw new AppError(404, "COMMENT_NOT_FOUND", "댓글을 찾을 수 없습니다.");
    return comment;
  }

  // 댓글 삭제
  async deleteComment(commentId: number, userId: string, client: SupabaseClient) {
    const deleted = await commentRepository.delete(commentId, userId, client);
    if (!deleted) throw new AppError(404, "COMMENT_NOT_FOUND", "댓글을 찾을 수 없습니다.");
  }

  // 게시글 댓글 수 조회
  async countComments(postId: number, client: SupabaseClient) {
    return commentRepository.countByPostId(postId, client);
  }
}

export const commentService = new CommentService();
