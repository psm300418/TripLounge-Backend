import { z } from "zod";
import { paginationSchema } from "../../../utils/schema.js";
export const feedSchema = paginationSchema.extend({
  sort: z.enum(["LATEST", "POPULAR"]).default("LATEST"),
  scope: z.enum(["ALL", "MATES"]).default("ALL"),
  q: z.string().trim().max(100).default(""),
});
export const neighborsSchema = z.object({ scope: z.enum(["ALL", "MATES"]).default("ALL") });
export type FeedInput = z.infer<typeof feedSchema>;
