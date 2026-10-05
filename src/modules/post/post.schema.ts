import { z } from "zod";

// 이미지 스키마
const photoSchema = z.object({
  imageUrl: z.string().url("유효한 이미지 URL이 필요합니다."),
  takenAt: z.string().datetime().optional(),         // 촬영 시간 
  placeName: z.string().max(255).optional(),          // 장소명 
  address: z.string().max(255).optional(),            // 상세 주소
  latitude: z.number().optional(),                    // 위도 
  longitude: z.number().optional(),                   // 경도 
  orderIndex: z.number().int().default(0),            // 사진 순서
});

// 하루 일기 스키마
const daySchema = z.object({
  dayNumber: z.number().int().positive(),             // 일차
  date: z.string().date("YYYY-MM-DD 형식이 필요합니다."),
  title: z.string().min(1, "제목을 입력해주세요.").max(255),
  content: z.string().min(1, "내용을 입력해주세요."), 
  photos: z.array(photoSchema).default([]),
});

// 게시글 작성 스키마
export const createPostSchema = z.object({
  startDate: z.string().date("YYYY-MM-DD 형식이 필요합니다."),
  endDate: z.string().date("YYYY-MM-DD 형식이 필요합니다."),
  visibility: z.enum(["PUBLIC", "FRIENDS", "MEMBERS_ONLY", "PRIVATE"]).default("PUBLIC"),
  memberIds: z.array(z.string().uuid()).default([]),  // 함께한 친구 목록
  days: z.array(daySchema).min(1, "최소 1일치 일기가 필요합니다."),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;