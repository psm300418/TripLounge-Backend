import { AppError } from "../../../middlewares/error.middleware.js";
import type { FeedInput } from "./feed.schema.js";
import type { FeedRepository } from "./feed.repository.js";
export class FeedService {
  constructor(private readonly repository: FeedRepository) {}
  async list(input: FeedInput) { return this.repository.list(input); }
  async getPostById(postId: number) {
    const post = await this.repository.findPostById(postId);
    if (!post) throw new AppError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
    return post;
  }
  async neighbors(postId: number, scope: "ALL" | "MATES") {
    await this.getPostById(postId);
    return this.repository.neighbors(postId, scope);
  }
}
