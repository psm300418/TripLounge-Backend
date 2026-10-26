import type { SupabaseClient } from "@supabase/supabase-js";
import { checkDb } from "../../../utils/database.js";
export type Notification = { id: string; type: string; post_id: number | null; friend_request_id: string | null; read_at: string | null };
export class NotificationRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly userId: string) {}
  async list(page: number, limit: number) {
    const { data, error, count } = await this.supabase.from("notifications").select("*", { count: "exact" })
      .eq("user_id", this.userId).order("created_at", { ascending: false }).order("id")
      .range((page - 1) * limit, page * limit - 1);
    checkDb(error); return { items: data as unknown, total: count, page, limit };
  }
  async find(id: string) {
    const { data, error } = await this.supabase.from("notifications").select("id,type,post_id,friend_request_id,read_at")
      .eq("id", id).eq("user_id", this.userId).maybeSingle();
    checkDb(error); return data as Notification | null;
  }
  async markAllRead() {
    const { error } = await this.supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", this.userId).is("read_at", null);
    checkDb(error);
  }
  async markRead(id: string) {
    const { error } = await this.supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", this.userId).is("read_at", null);
    checkDb(error);
  }
}
