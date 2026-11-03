import { z } from "zod";
import { paginationSchema } from "../../utils/schema.js";
export const friendQuerySchema = paginationSchema.extend({ q: z.string().trim().max(100).default("") });
export const friendRequestQuerySchema = paginationSchema.extend({
  direction: z.enum(["RECEIVED", "SENT"]).default("RECEIVED"),
  status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"]).default("PENDING"),
});
export const createFriendRequestSchema = z.object({ friendCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{7}$/) }).strict();
export const respondFriendRequestSchema = z.object({ status: z.enum(["ACCEPTED", "REJECTED", "CANCELLED"]) }).strict();
export type FriendRequestQuery = z.infer<typeof friendRequestQuerySchema>;
export type FriendRequestStatus = z.infer<typeof respondFriendRequestSchema>["status"];
