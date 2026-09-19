import { createClient } from "@supabase/supabase-js";

import { env } from "./env.js";

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  throw new Error("Supabase environment variables are required.");
}

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
