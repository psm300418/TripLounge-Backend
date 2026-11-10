import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../../middlewares/error.middleware.js";
import { checkDb } from "../../../utils/database.js";
import { avatarBucket, type AvatarImage } from "./avatar.schema.js";

export class AvatarRepository {
  constructor(private readonly supabase: SupabaseClient, readonly userId: string) {}

  async upload(path: string, bytes: Buffer, contentType: AvatarImage["contentType"]): Promise<string> {
    const bucket = this.supabase.storage.from(avatarBucket);
    const { error } = await bucket.upload(path, bytes, {
      contentType, cacheControl: "31536000", upsert: false,
    });
    if (error) throw new AppError(502, "AVATAR_UPLOAD_FAILED", "프로필 사진을 업로드하지 못했습니다.");
    return bucket.getPublicUrl(path).data.publicUrl;
  }

  async setAvatar(avatarUrl: string): Promise<{ id: string; avatar_url: string }> {
    const { data, error } = await this.supabase.from("users")
      .update({ avatar_url: avatarUrl }).eq("id", this.userId)
      .select("id,avatar_url").maybeSingle();
    checkDb(error);
    if (!data) throw new AppError(404, "USER_NOT_FOUND", "프로필을 찾을 수 없습니다.");
    return data as { id: string; avatar_url: string };
  }

  async removeUpload(path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(avatarBucket).remove([path]);
    if (error) throw new AppError(502, "AVATAR_CLEANUP_FAILED", "업로드 파일 정리에 실패했습니다.");
  }

  async currentAvatar(): Promise<{ id: string; avatar_url: string | null } | null> {
    const { data, error } = await this.supabase.from("users").select("id,avatar_url")
      .eq("id", this.userId).maybeSingle();
    checkDb(error);
    return data as { id: string; avatar_url: string | null } | null;
  }
}
