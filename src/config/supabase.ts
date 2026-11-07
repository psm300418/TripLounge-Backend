import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export const createSupabaseClient = (accessToken?: string) => createClient(
  env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  },
);
// 기존 post의 내보내기 이름을 유지하며 공용 객체의 setSession 사용은 금지임.
export const supabase = createSupabaseClient();
