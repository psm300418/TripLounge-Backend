import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../middlewares/error.middleware.js";

export class AuthProfileRepository {
  constructor(private readonly supabase: SupabaseClient) {}
  async find(userId: string) {
    const [profile, code] = await Promise.all([
      this.supabase.from("users").select("id,nickname,avatar_url").eq("id", userId).maybeSingle(),
      this.supabase.from("friend_codes").select("friend_code").eq("user_id", userId).maybeSingle(),
    ]);
    if (profile.error || code.error) throw new AppError(503, "PROFILE_UNAVAILABLE", "내 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    if (!profile.data || !code.data) throw new AppError(409, "PROFILE_NOT_READY", "계정 정보가 준비되지 않았습니다. 관리자에게 문의해주세요.");
    return { ...profile.data, friend_code: code.data.friend_code };
  }
}
