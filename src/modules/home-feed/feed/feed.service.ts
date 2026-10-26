import { AppError } from "../../../middlewares/error.middleware.js";
import type { FeedInput, FeedFilter } from "./feed.schema.js";
import type { FeedRepository } from "./feed.repository.js";
export class FeedService {
  constructor(private readonly repository: FeedRepository) {}
  async list(input: FeedInput) { return this.repository.list(input); }
  async getPostById(postId: number) {
    const post = await this.repository.findPostById(postId);
    if (!post) throw new AppError(404, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다.");
    return post;
  }
  async day(postId: number, dayNumber: number) {
    await this.getPostById(postId);
    const day = await this.repository.findDay(postId, dayNumber);
    if (!day) throw new AppError(404, "DAY_NOT_FOUND", "해당 일차를 찾을 수 없습니다.");
    return day;
  }
  async neighbors(postId: number, filter: FeedFilter) {
    await this.getPostById(postId);
    return this.repository.neighbors(postId, filter);
  }
}
