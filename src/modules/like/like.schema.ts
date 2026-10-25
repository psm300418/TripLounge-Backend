import { z } from "zod";

export const likePostParamsSchema = z.object({
  postId: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

export type LikePostParams = z.infer<typeof likePostParamsSchema>;

export const likeSummarySchema = z.object({
  likeCount: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  likedByMe: z.boolean(),
});
