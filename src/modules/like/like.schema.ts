import { z } from "zod";

export const likePostParamsSchema = z.object({
  postId: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

export type LikePostParams = z.infer<typeof likePostParamsSchema>;
