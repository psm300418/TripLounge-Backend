import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../config/supabase.js";
import { AppError } from "../../middlewares/error.middleware.js";
import type { CreatePostInput, UpdatePostInput } from "./post.schema.js";

export class PostRepository {

  // 게시글 저장 posts -> post_members -> post_days -> post_photos
  async createPost(userId: string, input: CreatePostInput, client: SupabaseClient = supabase) {

    // posts 테이블에 기본 정보 저장
    const { data: post, error: postError } = await client
      .from("posts")
      .insert({
        user_id: userId,
        start_date: input.startDate,
        end_date: input.endDate,
        visibility: input.visibility,
      })
      .select()
      .single();

    if (postError || !post) {
      console.error("Supabase post insert error:", postError);
      throw new AppError(500, "POST_CREATE_FAILED", "게시글 생성에 실패했습니다.");
    }

    // post_members 테이블에 함께한 친구 저장
    if (input.memberIds.length > 0) {
      const membersData = input.memberIds.map((memberId) => ({
        post_id: post.id,
        user_id: memberId,
      }));

      const { error: membersError } = await client
        .from("post_members")
        .insert(membersData);

      if (membersError) {
        console.error("Supabase post_members insert error:", membersError);
        throw new AppError(500, "POST_MEMBERS_CREATE_FAILED", "동행 멤버 저장에 실패했습니다.");
      }
    }

    // 각 일차마다 post_days에 저장
    for (const day of input.days) {

      // post_days 테이블에 일차별 제목, 본문 저장
      const { data: postDay, error: dayError } = await client
        .from("post_days")
        .insert({
          post_id: post.id,
          day_number: day.dayNumber,
          date: day.date,
          title: day.title,
          content: day.content,
        })
        .select()
        .single();

      if (dayError || !postDay) {
        console.error("Supabase post_days insert error:", dayError);
        throw new AppError(500, "POST_DAY_CREATE_FAILED", `${day.dayNumber}일차 저장에 실패했습니다.`);
      }

      // 해당 일차의 사진 저장 
      if (day.photos.length > 0) {
        const photosData = day.photos.map((photo) => ({
          post_day_id: postDay.id,
          image_url: photo.imageUrl,
          taken_at: photo.takenAt,
          place_name: photo.placeName,
          address: photo.address,
          latitude: photo.latitude,
          longitude: photo.longitude,
          order_index: photo.orderIndex,
        }));

        const { error: photosError } = await client
          .from("post_photos")
          .insert(photosData);

        if (photosError) {
          console.error("Supabase post_photos insert error:", photosError);
          throw new AppError(500, "POST_PHOTOS_CREATE_FAILED", `${day.dayNumber}일차 사진 저장에 실패했습니다.`);
        }
      }
    }

    return post;
  }



  // 이미지 업로드
  async uploadImageToStorage(fileName: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const { error } = await supabase.storage
      .from("post-images")
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new AppError(500, "IMAGE_UPLOAD_FAILED", "이미지 업로드에 실패했습니다.");
    }

    const { data } = supabase.storage
      .from("post-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  // 게시글 테이블 4개 묶어서 한번에 조회
  async findPostById(postId: number, client: SupabaseClient = supabase) {
    const { data: post, error } = await client
      .from("posts")
      .select(`
        id,
        user_id,
        start_date,
        end_date,
        visibility,
        created_at,
        updated_at,
        post_members (
          user_id
        ),
        post_days (
          id,
          day_number,
          date,
          title,
          content,
          post_photos (
            id,
            image_url,
            taken_at,
            place_name,
            address,
            latitude,
            longitude,
            order_index
          )
        )
      `)
      .eq("id", postId)
      .single();

    if (error || !post) {
      return null;
    }

    return post;
  }



  // 게시글 삭제 
  async deletePostById(postId: number, client: SupabaseClient = supabase) {
    const { error } = await client
      .from("posts")
      .delete()
      .eq("id", postId);

    if (error) {
      console.error("Supabase post delete error:", error);
      throw new AppError(500, "POST_DELETE_FAILED", "게시글 삭제에 실패했습니다.");
    }
  }



  // 게시글 수정
  async updatePost(postId: number, input: UpdatePostInput, client: SupabaseClient = supabase) {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.startDate) updateData.start_date = input.startDate;
    if (input.endDate) updateData.end_date = input.endDate;
    if (input.visibility) updateData.visibility = input.visibility;

    const { error: postError } = await client
      .from("posts")
      .update(updateData)
      .eq("id", postId);

    if (postError) {
      console.error("Supabase post update error:", postError);
      throw new AppError(500, "POST_UPDATE_FAILED", "게시글 기본 정보 수정에 실패했습니다.");
    }

    // 동행 멤버 교체
    if (input.memberIds !== undefined) {
      await client.from("post_members").delete().eq("post_id", postId);

      if (input.memberIds.length > 0) {
        const membersData = input.memberIds.map((memberId) => ({
          post_id: postId,
          user_id: memberId,
        }));
        const { error: memberError } = await client.from("post_members").insert(membersData);
        if (memberError) {
          throw new AppError(500, "POST_MEMBERS_UPDATE_FAILED", "동행 멤버 수정에 실패했습니다.");
        }
      }
    }

    // 일차 및 사진 교체
    if (input.days !== undefined) {
      await client.from("post_days").delete().eq("post_id", postId);

      for (const day of input.days) {
        const { data: postDay, error: dayError } = await client
          .from("post_days")
          .insert({
            post_id: postId,
            day_number: day.dayNumber,
            date: day.date,
            title: day.title,
            content: day.content,
          })
          .select()
          .single();

        if (dayError || !postDay) {
          throw new AppError(500, "POST_DAY_UPDATE_FAILED", `${day.dayNumber}일차 수정에 실패했습니다.`);
        }

        if (day.photos.length > 0) {
          const photosData = day.photos.map((photo) => ({
            post_day_id: postDay.id,
            image_url: photo.imageUrl,
            taken_at: photo.takenAt,
            place_name: photo.placeName,
            address: photo.address,
            latitude: photo.latitude,
            longitude: photo.longitude,
            order_index: photo.orderIndex,
          }));

          const { error: photoError } = await client.from("post_photos").insert(photosData);
          if (photoError) {
            throw new AppError(500, "POST_PHOTOS_UPDATE_FAILED", `${day.dayNumber}일차 사진 수정에 실패했습니다.`);
          }
        }
      }
    }

    return await this.findPostById(postId, client);
  }
  
}

export const postRepository = new PostRepository();