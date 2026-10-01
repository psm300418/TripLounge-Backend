import { z } from 'zod';

// 게시글 작성 요청 데이터 형식 정의
export const createPostSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.').max(100),
  content: z.string().min(1, '내용을 입력해주세요.'),
  visibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']).default('PUBLIC'),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
