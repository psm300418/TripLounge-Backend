import { z } from "zod";

const idSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export const postCommentParamsSchema = z.object({ postId: idSchema });
export const commentParamsSchema = z.object({ commentId: idSchema });

export const commentListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(500000).default(0),
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  // 최상위 댓글은 생략하고 대댓글은 부모 댓글 ID를 전달
  parentCommentId: idSchema.optional(),
}).strict();

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
}).strict();

export type CommentListQuery = z.infer<typeof commentListQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export type CommentItem = {
  id: number;
  parentCommentId: number | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  author: { nickname: string; avatarUrl: string | null } | null;
  isMine: boolean;
};

export type CommentPage = {
  items: (CommentItem & { replyCount: number })[];
  total: number;
  limit: number;
  offset: number;
};

export type CommentReplyPage = {
  items: CommentItem[];
  total: number;
  limit: number;
  offset: number;
};
