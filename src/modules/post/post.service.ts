import { randomUUID } from "node:crypto";
import path from "node:path";
import { postRepository } from "./post.repository.js";
import { AppError } from "../../middlewares/error.middleware.js";
import type { CreatePostInput } from "./post.schema.js";

export class PostService {
  // 게시글 작성
  async createPost(userId: string, input: CreatePostInput) {


    return await postRepository.createPost(userId, input);
  }


  // 이미지 업로드 
  async uploadImage(file?: Express.Multer.File): Promise<string> {
    // 파일이 존재하는지 검사
    if (!file) {
      throw new AppError(400, "INVALID_REQUEST", "업로드할 이미지 파일이 필요합니다.");
    }

    // 파일 이름 중복 방지 
    const fileExtension = path.extname(file.originalname) || ".jpg";
    const uniqueFileName = `${Date.now()}_${randomUUID()}${fileExtension}`;

    return await postRepository.uploadImageToStorage(
      uniqueFileName,
      file.buffer,
      file.mimetype
    );
  }
}

export const postService = new PostService();