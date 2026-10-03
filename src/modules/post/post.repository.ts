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
      console.error("Supabase Error Details:", error);
      throw new AppError(500, "POST_CREATE_FAILED", "게시글 생성에 실패했습니다.");
    }

    return data;
  }


  // 이미지 업로드
  async uploadImageToStorage(fileName: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const { error } = await supabase.storage
      .from("post-images")
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error("Storage Upload Error:", error);
      throw new AppError(500, "IMAGE_UPLOAD_FAILED", "이미지 업로드에 실패했습니다.");
    }

    // URL 가져오기
    const { data } = supabase.storage
      .from("post-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }
}

export const postRepository = new PostRepository();