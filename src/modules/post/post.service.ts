import { randomUUID } from "node:crypto";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { postRepository } from "./post.repository.js";
import { AppError } from "../../middlewares/error.middleware.js";
import type { CreatePostInput, UpdatePostInput } from "./post.schema.js";
import { findRoadAddress } from "./post.geocoding.js";

export class PostService {

  // 게시글 작성
  async createPost(input: CreatePostInput, client?: SupabaseClient) {
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

    return await postRepository.createPost(input, client);
  }
  


  // 이미지 업로드 + 사진 메타데이터 추출
  async uploadImage(file?: Express.Multer.File): Promise<{
  imageUrl: string;
  takenAt?: string;
  latitude?: number;
  longitude?: number;
  address: string | null;
}> {
  if (!file) {
    throw new AppError(400, "INVALID_REQUEST", "업로드할 이미지 파일이 필요합니다.");
  }

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
    // EXIF 파싱에 실패해도 사진 업로드는 계속 진행
  }

  const fileExtension = path.extname(file.originalname) || ".jpg";
  const uniqueFileName = `${Date.now()}_${randomUUID()}${fileExtension}`;

  const addressPromise =
    latitude !== undefined && longitude !== undefined
      ? findRoadAddress(latitude, longitude)
      : Promise.resolve(null);

  const [imageUrl, address] = await Promise.all([
    postRepository.uploadImageToStorage(
      uniqueFileName,
      file.buffer,
      file.mimetype
    ),
    addressPromise,
  ]);

  return { imageUrl, takenAt, latitude, longitude, address };
}



  // 게시글 조회
  async getPostById(postId: number, client: SupabaseClient) {
    const post = await postRepository.findPostById(postId, client);

    if (!post) {
      throw new AppError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
    }

    return post;
  }



  // 게시글 삭제
  async deletePost(postId: number, client?: SupabaseClient) {
    const post = await postRepository.findPostById(postId, client);
    if (!post) {
      throw new AppError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
    }

    await postRepository.deletePostById(postId, client);
  }



  // 게시글 수정
  async updatePost(postId: number, input: UpdatePostInput, client?: SupabaseClient) {
    const post = await postRepository.findPostById(postId, client);
    if (!post) {
      throw new AppError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
    }

    const startDate = input.startDate || post.start_date;
    const endDate = input.endDate || post.end_date;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        throw new AppError(400, "INVALID_DATE_RANGE", "종료일은 시작일 이후여야 합니다.");
      }
      if (diffDays > 30) {
        throw new AppError(400, "EXCEED_MAX_DAYS", "여행 기간은 최대 30일까지 가능합니다.");
      }
    }

    return await postRepository.updatePost(postId, input, client);
  }

} 

export const postService = new PostService();
