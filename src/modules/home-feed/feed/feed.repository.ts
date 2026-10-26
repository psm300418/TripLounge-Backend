import type { SupabaseClient } from "@supabase/supabase-js";
import { likeRepository } from "../../like/like.repository.js";
import { checkDb } from "../../../utils/database.js";
import type { FeedInput, FeedFilter } from "./feed.schema.js";
export class FeedRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly userId: string) {}
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
      .order("order_index", { referencedTable: "post_days.post_photos" })
      .order("id", { referencedTable: "post_days.post_photos" }).maybeSingle();
    checkDb(error);
    if (!data) return null;
    const people = await this.supabase.rpc("get_post_people", { p_post_id: postId });
    checkDb(people.error);
    const summary = await likeRepository.findLikeSummary(postId, this.userId, this.supabase);
    return { ...data, ...(people.data as { author: unknown; mates: unknown[] } | null), ...summary, like_count: summary.likeCount, liked: summary.likedByMe };
  }
  async findDay(postId: number, dayNumber: number) {
    const { data, error } = await this.supabase.from("post_days")
      .select("id,post_id,day_number,date,title,content,post_photos(id,image_url,taken_at,place_name,address,latitude,longitude,order_index)")
      .eq("post_id", postId).eq("day_number", dayNumber)
      .order("order_index", { referencedTable: "post_photos" })
      .order("id", { referencedTable: "post_photos" }).maybeSingle();
    checkDb(error); return data as unknown;
  }
  async neighbors(postId: number, filter: FeedFilter) {
    const { data, error } = await this.supabase.rpc("feed_neighbors_filtered", { p_post_id: postId, p_scope: filter.scope, p_sort: filter.sort, p_query: filter.q });
    checkDb(error); return data as unknown;
  }
}
