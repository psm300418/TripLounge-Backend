import type { SupabaseClient } from "@supabase/supabase-js";
import { checkDb } from "../../utils/database.js";
import type { CommentListQuery, CommentPage, CommentReplyPage } from "./comment.schema.js";
import { AppError } from "../../middlewares/error.middleware.js";

export class CommentRepository {
  // 현재 사용자가 조회할 수 있는 게시글인지 확인
  async postIsVisible(postId: number, client: SupabaseClient): Promise<boolean> {
    const { data, error } = await client
      .from("posts")
      .select("id")
      .eq("id", postId)
      .maybeSingle();

    checkDb(error);
    return Boolean(data);
  }

  // 게시글 댓글 목록과 공개 가능한 작성자 정보 조회
  async findByPostId(postId: number, query: CommentListQuery, client: SupabaseClient) {
    const { data, error } = await client.rpc("list_post_comments", {
      p_post_id: postId,
      p_limit: query.limit,
      p_offset: query.offset,
    });

    checkDb(error);
    if (!data) {
      throw new AppError(500, "COMMENT_LIST_FAILED", "댓글 목록을 불러오지 못했습니다.");
    }
    return data as CommentPage;
  }

  // 최상위 댓글의 대댓글 조회
  async findReplies(commentId: number, query: CommentListQuery, client: SupabaseClient) {
    const { data, error } = await client.rpc("list_comment_replies", {
      p_comment_id: commentId,
      p_limit: query.limit,
      p_offset: query.offset,
    });

    checkDb(error);
    if (!data) {
      throw new AppError(500, "COMMENT_REPLIES_FAILED", "대댓글을 불러오지 못했습니다.");
    }
    return data as CommentReplyPage;
  }

  // 댓글 저장
  async create(postId: number, userId: string, content: string, parentCommentId: number | undefined, client: SupabaseClient) {
    const { data, error } = await client.rpc("create_post_comment", {
      p_post_id: postId,
      p_user_id: userId,
      p_content: content,
      p_parent_comment_id: parentCommentId ?? null,
    });

    checkDb(error);
    if (!data) {
      throw new AppError(500, "COMMENT_CREATE_FAILED", "댓글 작성에 실패했습니다.");
    }

    return data;
  }

  // 작성자 본인의 댓글 수정
  async update(commentId: number, userId: string, content: string, client: SupabaseClient) {
    const { data, error } = await client.rpc("update_post_comment", {
      p_comment_id: commentId,
      p_user_id: userId,
      p_content: content,
    });

    checkDb(error);
    if (!data) return null;
    return data;
  }

  // 작성자 본인의 댓글을 삭제
  async delete(commentId: number, userId: string, client: SupabaseClient): Promise<boolean> {
    const { data, error } = await client.rpc("delete_post_comment", {
      p_comment_id: commentId,
      p_user_id: userId,
    });

    checkDb(error);
    return Boolean(data);
  }

  // 게시글 댓글 수 조회
  async countByPostId(postId: number, client: SupabaseClient): Promise<number> {
    const { count, error } = await client
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId)
      .is("deleted_at", null);

    checkDb(error);
    return count ?? 0;
  }
}

export const commentRepository = new CommentRepository();
