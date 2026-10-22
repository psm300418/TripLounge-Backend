import { z } from "zod";

const parsedEnv = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  CLIENT_ORIGIN: z.string().url(),
  NAVER_MAPS_API_KEY_ID: z.string().min(1),
  NAVER_MAPS_API_KEY: z.string().min(1),
}).parse(process.env);

if (parsedEnv.NODE_ENV === "production" &&
    [parsedEnv.CLIENT_ORIGIN, parsedEnv.SUPABASE_URL].some(url => !url.startsWith("https://"))) {
  throw new Error("Production URLs must use HTTPS.");
}
export const env = {
  nodeEnv: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
  supabaseUrl: parsedEnv.SUPABASE_URL,
  supabaseAnonKey: parsedEnv.SUPABASE_ANON_KEY,
  clientOrigin: new URL(parsedEnv.CLIENT_ORIGIN).origin,
  naverMapsApiKeyId: parsedEnv.NAVER_MAPS_API_KEY_ID,
  naverMapsApiKey: parsedEnv.NAVER_MAPS_API_KEY,
};
