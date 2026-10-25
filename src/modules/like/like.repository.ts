import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../middlewares/error.middleware.js";
import { checkDb } from "../../utils/database.js";
import { likeSummarySchema } from "./like.schema.js";

export class LikeRepository {
  // 사용자가 조회 가능한 게시글인지 확인하는 기능임.
  async postExists(postId: number, client: SupabaseClient): Promise<boolean> {
    const { data, error } = await client
      .from("posts")
      .select("id")
      .eq("id", postId)
      .maybeSingle();

    checkDb(error);

    return Boolean(data);
  }

  // 같은 사용자의 중복 좋아요를 방지하는 처리임.
  async addLike(postId: number, userId: string, client: SupabaseClient): Promise<void> {
    const { error } = await client
      .from("post_likes")
      .insert({ post_id: postId, user_id: userId });

    if (error?.code === "23505") return;
    // 조회 후 저장 전에 발생한 게시글 삭제·비공개 전환을 처리하는 부분임.
    if (error?.code === "23503") throw new AppError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
    checkDb(error);
  }

  // 현재 사용자의 좋아요만 삭제하는 기능임.
  async removeLike(postId: number, userId: string, client: SupabaseClient): Promise<void> {
    // 비공개로 바뀐 글도 auth.uid()에 해당하는 본인 좋아요만 삭제하는 RPC임.
    const { error } = await client.rpc("remove_post_like", { p_post_id: postId });

    checkDb(error);
  }

  // 좋아요 수와 현재 사용자의 좋아요 여부를 조회하는 기능임.
  async findLikeSummary(postId: number, userId: string, client: SupabaseClient) {
    // 팀 함수의 인자 형식을 유지하고 조회 사용자는 JWT로 판별하는 방식임.
    // 동시 변경 시 수와 상태가 어긋나지 않도록 같은 시점에 조회하는 방식임.
    const { data, error } = await client.rpc("get_post_like_summary", { p_post_id: postId });
    checkDb(error);
    const summary = likeSummarySchema.safeParse(data);
    if (!summary.success) throw new AppError(500, "POST_LIKE_SUMMARY_FAILED", "게시글 좋아요 정보를 불러오지 못했습니다.");
    return summary.data;
  }
}

export const likeRepository = new LikeRepository();
