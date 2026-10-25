import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../middlewares/error.middleware.js";
import { checkDb } from "../../utils/database.js";
import { likeSummarySchema } from "./like.schema.js";

export class LikeRepository {
  // 사용자가 조회할 수 있는 게시글인지 확인
  async postExists(postId: number, client: SupabaseClient): Promise<boolean> {
    const { data, error } = await client
      .from("posts")
      .select("id")
      .eq("id", postId)
      .maybeSingle();

    checkDb(error);

    return Boolean(data);
  }

  // 중복 좋아요를 방지
  async addLike(postId: number, userId: string, client: SupabaseClient): Promise<void> {
    const { error } = await client
      .from("post_likes")
      .insert({ post_id: postId, user_id: userId });

    if (error?.code === "23505") return;
    // A post may be deleted or become private between lookup and insert.
    if (error?.code === "23503") throw new AppError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
    checkDb(error);
  }

  // 현재 사용자의 좋아요만 삭제
  async removeLike(postId: number, userId: string, client: SupabaseClient): Promise<void> {
    // The RPC scopes deletion to auth.uid(), including now-hidden posts.
    const { error } = await client.rpc("remove_post_like", { p_post_id: postId });

    checkDb(error);
  }

  // 게시글 좋아요 수와 현재 사용자의 좋아요 여부 조회
  async findLikeSummary(postId: number, userId: string, client: SupabaseClient) {
    // Keep the team method signature; the database derives the viewer from the JWT.
    // One snapshot prevents a count/status mismatch during concurrent changes.
    const { data, error } = await client.rpc("get_post_like_summary", { p_post_id: postId });
    checkDb(error);
    const summary = likeSummarySchema.safeParse(data);
    if (!summary.success) throw new AppError(500, "POST_LIKE_SUMMARY_FAILED", "게시글 좋아요 정보를 불러오지 못했습니다.");
    return summary.data;
  }
}

export const likeRepository = new LikeRepository();
