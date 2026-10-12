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
  
  // 이미지 업로드 + 사진 메타데이터 추출
  async uploadImage(file?: Express.Multer.File): Promise<{
    imageUrl: string;
    takenAt?: string;
    latitude?: number;
    longitude?: number;
  }> {
    if (!file) {
      throw new AppError(400, "INVALID_REQUEST", "업로드할 이미지 파일이 필요합니다.");
    }
    // EXIF 메타데이터 추출 
    let takenAt: string | undefined;
    let latitude: number | undefined;
    let longitude: number | undefined;

    try {
      const exifr = await import("exifr");
      const [exif, gps] = await Promise.all([
        exifr.default.parse(file.buffer).catch(() => null),
        exifr.default.gps(file.buffer).catch(() => null),
      ]);

      if (exif?.DateTimeOriginal) {
        takenAt = new Date(exif.DateTimeOriginal).toISOString();
      }
      if (gps) {
        latitude = gps.latitude;
        longitude = gps.longitude;
      }
    } catch {
      // EXIF가 없는 사진이거나 파싱 실패해도 업로드는 계속 진행
    }
    // 파일명 중복 방지
    const fileExtension = path.extname(file.originalname) || ".jpg";
    const uniqueFileName = `${Date.now()}_${randomUUID()}${fileExtension}`;
    // Storage 업로드 후 URL 받기
    const imageUrl = await postRepository.uploadImageToStorage(
      uniqueFileName,
      file.buffer,
      file.mimetype
    );
    
    return { imageUrl, takenAt, latitude, longitude };
  }
} 

export const postService = new PostService();