import type { SupabaseClient } from "@supabase/supabase-js";
import type { Response } from "express";
export type AuthContext = { userId: string; accessToken: string; supabase: SupabaseClient };
export const getAuth = (res: Response): AuthContext => res.locals.auth as AuthContext;
