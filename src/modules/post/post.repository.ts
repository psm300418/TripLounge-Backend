import { supabase } from "../../config/supabase.js";
import { AppError } from "../../middlewares/error.middleware.js";
import type { CreatePostInput } from "./post.schema.js";

export class PostRepository {

  // 게시글 저장 posts -> post_members -> post_days -> post_photos
  async createPost(userId: string, input: CreatePostInput) {

    // posts 테이블에 기본 정보 저장
    const { data: post, error: postError } = await supabase
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
      throw new AppError(500, "POST_CREATE_FAILED", "게시글 생성에 실패했습니다.");
    }

    // post_members 테이블에 함께한 친구 저장
    if (input.memberIds.length > 0) {
      const membersData = input.memberIds.map((memberId) => ({
        post_id: post.id,
        user_id: memberId,
      }));

      const { error: membersError } = await supabase
        .from("post_members")
        .insert(membersData);

      if (membersError) {
        throw new AppError(500, "POST_MEMBERS_CREATE_FAILED", "동행 멤버 저장에 실패했습니다.");
      }
    }

    // 각 일차마다 post_days에 저장
    for (const day of input.days) {

      // post_days 테이블에 일차별 제목, 본문 저장
      const { data: postDay, error: dayError } = await supabase
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

        const { error: photosError } = await supabase
          .from("post_photos")
          .insert(photosData);

        if (photosError) {
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
}

export const postRepository = new PostRepository();