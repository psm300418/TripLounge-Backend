import { postRepository } from "./post.repository.js";
import { AppError } from "../../middlewares/error.middleware.js";

export class PostService {
  async getPostById(postId: number) {
    const post = await postRepository.findPostById(postId);
    if (!post || post.visibility !== "PUBLIC") {
      throw new AppError(404, "POST_NOT_FOUND", "공개된 게시글을 찾을 수 없습니다.");
    }
    return post;
  }
}

export const postService = new PostService();
