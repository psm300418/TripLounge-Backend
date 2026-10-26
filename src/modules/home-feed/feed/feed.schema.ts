import { z } from "zod";
import { paginationSchema } from "../../../utils/schema.js";
export const feedSchema = paginationSchema.extend({
  sort: z.enum(["LATEST", "POPULAR"]).default("LATEST"),
  scope: z.enum(["ALL", "MATES", "ME"]).default("ALL"),
  q: z.string().trim().max(100).default(""),
});
export const neighborsSchema = feedSchema.pick({ scope: true, sort: true, q: true });
export const dayParamsSchema = z.object({ id: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER), dayNumber: z.coerce.number().int().positive().max(3660) });
export type FeedFilter = z.infer<typeof neighborsSchema>;
export type FeedInput = z.infer<typeof feedSchema>;
