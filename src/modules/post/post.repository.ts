import { supabase } from "../../config/supabase.js";
import { AppError } from "../../middlewares/error.middleware.js";
import type { CreatePostInput } from "./post.schema.js";

export class PostRepository {

  // 게시글 생성
  async createPost(userId: string, input: CreatePostInput) {
    const { data, error } = await supabase
      .from("posts")        
      .insert({           
        user_id: userId,
        title: input.title,
        content: input.content,
        visibility: input.visibility,
      })
      .select()             
      .single();           

    // DB 저장 실패하면 에러 
    if (error || !data) {
      throw new AppError(500, "POST_CREATE_FAILED", "게시글 생성에 실패했습니다.");
    }

    return data;
  }
}

export const postRepository = new PostRepository();