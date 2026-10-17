import type { SupabaseClient } from "@supabase/supabase-js";
import { checkDb } from "../../../utils/database.js";
import type { FeedInput } from "./feed.schema.js";
export class FeedRepository {
  constructor(private readonly supabase: SupabaseClient) {}
  async list(input: FeedInput) {
    const { data, error } = await this.supabase.rpc("list_feed", {
      p_sort: input.sort, p_scope: input.scope, p_query: input.q,
      p_limit: input.limit, p_offset: (input.page - 1) * input.limit,
    });
    checkDb(error); return data as unknown;
  }
  async findPostById(postId: number) {
    const { data, error } = await this.supabase.from("posts")
      .select("id,user_id,start_date,end_date,visibility,created_at,updated_at,post_members(user_id),post_days(id,day_number,date,title,content,post_photos(id,image_url,taken_at,place_name,address,latitude,longitude,order_index))")
      .eq("id", postId).order("day_number", { referencedTable: "post_days" })
      .order("order_index", { referencedTable: "post_days.post_photos" }).maybeSingle();
    checkDb(error); return data as unknown;
  }
  async neighbors(postId: number, scope: "ALL" | "MATES") {
    const { data, error } = await this.supabase.rpc("feed_neighbors", { p_post_id: postId, p_scope: scope });
    checkDb(error); return data as unknown;
  }
}
