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
}).strict();

export const updateCommentSchema = createCommentSchema;

export type CommentListQuery = z.infer<typeof commentListQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export type CommentPage = {
  items: {
    id: number;
    content: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    author: { nickname: string; avatarUrl: string | null } | null;
    isMine: boolean;
  }[];
  total: number;
  limit: number;
  offset: number;
};
