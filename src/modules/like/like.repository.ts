import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../middlewares/error.middleware.js";

export class LikeRepository {
  // 사용자가 조회할 수 있는 게시글인지 확인
  async postExists(postId: number, client: SupabaseClient): Promise<boolean> {
    const { data, error } = await client
      .from("posts")
      .select("id")
      .eq("id", postId)
      .maybeSingle();

    if (error) {
      console.error("Supabase post lookup error:", error);
      throw new AppError(500, "POST_LOOKUP_FAILED", "게시글 확인에 실패했습니다.");
    }

    return Boolean(data);
  }

  // 중복 좋아요를 방지
  async addLike(postId: number, userId: string, client: SupabaseClient): Promise<void> {
    const { error } = await client
      .from("post_likes")
      .insert({ post_id: postId, user_id: userId });

    if (error?.code === "23505") return;
    if (error) {
      console.error("Supabase post like insert error:", error);
      throw new AppError(500, "POST_LIKE_CREATE_FAILED", "게시글 좋아요 처리에 실패했습니다.");
    }
  }

  // 현재 사용자의 좋아요만 삭제
  async removeLike(postId: number, userId: string, client: SupabaseClient): Promise<void> {
    const { error } = await client
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);

    if (error) {
      console.error("Supabase post like delete error:", error);
      throw new AppError(500, "POST_LIKE_DELETE_FAILED", "게시글 좋아요 취소에 실패했습니다.");
    }
  }

  // 게시글 좋아요 수와 현재 사용자의 좋아요 여부 조회
  async findLikeSummary(postId: number, userId: string, client: SupabaseClient) {
    const [countResult, userLikeResult] = await Promise.all([
      client.from("post_likes").select("id", { count: "exact", head: true }).eq("post_id", postId),
      client.from("post_likes").select("id").eq("post_id", postId).eq("user_id", userId).maybeSingle(),
    ]);

    if (countResult.error || userLikeResult.error) {
      console.error("Supabase post like summary error:", countResult.error ?? userLikeResult.error);
      throw new AppError(500, "POST_LIKE_SUMMARY_FAILED", "게시글 좋아요 정보를 불러오지 못했습니다.");
    }

    return { likeCount: countResult.count ?? 0, likedByMe: Boolean(userLikeResult.data) };
  }
}

export const likeRepository = new LikeRepository();
