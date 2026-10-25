import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../middlewares/error.middleware.js";
import { likeRepository } from "./like.repository.js";

export class LikeService {
  // 좋아요 추가
  async likePost(postId: number, userId: string, client: SupabaseClient): Promise<void> {
    const postExists = await likeRepository.postExists(postId, client);
    if (!postExists) {
      throw new AppError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
    }

    await likeRepository.addLike(postId, userId, client);
  }

  // 좋아요 취소
  async unlikePost(postId: number, userId: string, client: SupabaseClient): Promise<void> {
    await likeRepository.removeLike(postId, userId, client);
  }

  // 좋아요 정보 조회
  async getLikeSummary(postId: number, userId: string, client: SupabaseClient) {
    return await likeRepository.findLikeSummary(postId, userId, client);
  }
}

export const likeService = new LikeService();
