import type { SupabaseClient } from "@supabase/supabase-js";
import { checkDb } from "../../utils/database.js";
import type { FriendRequestQuery, FriendRequestStatus } from "./friend.schema.js";
export class FriendRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly userId: string) {}
  async code() {
    const { data, error } = await this.supabase.from("friend_codes").select("friend_code").eq("user_id", this.userId).single();
    checkDb(error); return { friendCode: (data as { friend_code: string }).friend_code };
  }
  async list(page: number, limit: number, q: string) {
    const { data, error } = await this.supabase.rpc("search_friends", { p_query: q, p_limit: limit, p_offset: (page - 1) * limit });
    checkDb(error); return data as unknown;
  }
  async requests(input: FriendRequestQuery) {
    const field = input.direction === "RECEIVED" ? "receiver_id" : "sender_id";
    const { data, error, count } = await this.supabase.from("friend_requests").select("*", { count: "exact" })
      .eq(field, this.userId).eq("status", input.status).order("created_at", { ascending: false }).order("id")
      .range((input.page - 1) * input.limit, input.page * input.limit - 1);
    checkDb(error); return { items: data as unknown, total: count, page: input.page, limit: input.limit };
  }
  async createRequest(friendCode: string) {
    const { data, error } = await this.supabase.rpc("create_friend_request", { p_friend_code: friendCode });
    checkDb(error); return data as unknown;
  }
  async respond(id: string, status: FriendRequestStatus) {
    const { data, error } = await this.supabase.rpc("respond_friend_request", { p_request_id: id, p_status: status });
    checkDb(error); return data as unknown;
  }
  async remove(friendId: string) {
    const { error } = await this.supabase.rpc("remove_friend", { p_friend_id: friendId }); checkDb(error);
  }
}
