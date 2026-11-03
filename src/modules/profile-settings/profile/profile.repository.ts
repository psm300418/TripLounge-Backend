import type { SupabaseClient } from "@supabase/supabase-js";
import { checkDb } from "../../../utils/database.js";
import type { UpdateProfileInput } from "./profile.schema.js";
export class ProfileRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly userId: string) {}
  async find() {
    const { data, error } = await this.supabase.from("users").select("id,nickname,avatar_url,bio,created_at,updated_at").eq("id", this.userId).maybeSingle();
    checkDb(error); return data as unknown;
  }
  async update(input: UpdateProfileInput) {
    const values: Record<string, unknown> = {};
    if (input.nickname !== undefined) values.nickname = input.nickname;
    if (input.bio !== undefined) values.bio = input.bio;
    if (input.avatarUrl !== undefined) values.avatar_url = input.avatarUrl;
    const { data, error } = await this.supabase.from("users").update(values).eq("id", this.userId)
      .select("id,nickname,avatar_url,bio,created_at,updated_at").maybeSingle();
    checkDb(error); return data as unknown;
  }
}
