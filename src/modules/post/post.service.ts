import { postRepository } from "./post.repository.js";
import type { CreatePostInput } from "./post.schema.js";

export class PostService {

  // 게시글 작성
  async createPost(userId: string, input: CreatePostInput) {
    

    // Repository에 실제 저장 요청
    return await postRepository.createPost(userId, input);
  }
}

export const postService = new PostService();