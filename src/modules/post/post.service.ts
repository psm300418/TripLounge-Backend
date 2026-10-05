import { randomUUID } from "node:crypto";
import path from "node:path";
import { postRepository } from "./post.repository.js";
import { AppError } from "../../middlewares/error.middleware.js";
import type { CreatePostInput } from "./post.schema.js";

export class PostService {

  // 게시글 작성
  async createPost(userId: string, input: CreatePostInput) {
    // 여행 기간 검사, 최대 30일
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      throw new AppError(400, "INVALID_DATE_RANGE", "종료일은 시작일 이후여야 합니다.");
    }
    if (diffDays > 30) {
      throw new AppError(400, "EXCEED_MAX_DAYS", "여행 기간은 최대 30일까지 가능합니다.");
    }

    return await postRepository.createPost(userId, input);
  }

  // 이미지 업로드
  async uploadImage(file?: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new AppError(400, "INVALID_REQUEST", "업로드할 이미지 파일이 필요합니다.");
    }

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