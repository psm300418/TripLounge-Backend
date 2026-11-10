import { z } from "zod";
export const updateProfileSchema = z.object({
  nickname: z.string().trim().min(2).max(12).optional(),
  bio: z.string().trim().max(60).optional(),
  avatarUrl: z.string().url().max(2048).refine(value => value.startsWith("https://"), "HTTPS URL required").nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0);
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
