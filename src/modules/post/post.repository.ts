import { supabase } from "../../config/supabase.js";
import { AppError } from "../../middlewares/error.middleware.js";

export class PostRepository {
  async findPostById(postId: number) {
    const { data, error } = await supabase.rpc("get_shared_post", { p_post_id: postId });
    if (error) {
      console.error("Shared post lookup failed:", error.code);
      throw new AppError(500, "POST_READ_FAILED", "공유 일기를 불러오지 못했습니다.");
    }
    return data;
  }
}

export const postRepository = new PostRepository();
