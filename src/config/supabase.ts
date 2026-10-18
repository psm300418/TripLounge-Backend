import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export const createSupabaseClient = (accessToken?: string) => createClient(
  env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  },
);
// Keep the existing post project's export name; never setSession on this singleton.
export const supabase = createSupabaseClient();
