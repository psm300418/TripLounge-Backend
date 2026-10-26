import { z } from "zod";
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export const postIdSchema = z.object({ id: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER) });
export const uuidIdSchema = z.object({ id: z.string().uuid() });
