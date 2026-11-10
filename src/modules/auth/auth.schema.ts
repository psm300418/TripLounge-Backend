import { z } from "zod";
export const providerSchema = z.object({ provider: z.enum(["google", "kakao", "apple"]) });
export const callbackSchema = z.object({ code: z.string().min(1).max(2048) }).strict();
export const refreshSchema = z.object({ refreshToken: z.string().min(1).max(8192) }).strict();
export type SocialProvider = z.infer<typeof providerSchema>["provider"];
