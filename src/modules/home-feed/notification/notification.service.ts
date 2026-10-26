import { AppError } from "../../../middlewares/error.middleware.js";
import type { FeedService } from "../feed/feed.service.js";
import type { NotificationRepository } from "./notification.repository.js";
export class NotificationService {
  constructor(private readonly repository: NotificationRepository, private readonly feedService: FeedService) {}
  async list(page: number, limit: number) { return this.repository.list(page, limit); }
  private async find(id: string) {
    const item = await this.repository.find(id);
    if (!item) throw new AppError(404, "NOTIFICATION_NOT_FOUND", "알림을 찾을 수 없습니다.");
    return item;
  }
  async target(id: string) {
    const item = await this.find(id);
    if (item.post_id !== null) {
      await this.feedService.getPostById(item.post_id);
      return { type: "POST", postId: item.post_id, path: `/posts/${item.post_id}` };
    }
    if (item.friend_request_id) return { type: "FRIEND_REQUEST", friendRequestId: item.friend_request_id, path: "/friend-requests" };
    throw new AppError(404, "TARGET_NOT_FOUND", "알림 대상이 삭제되었습니다.");
  }
  async markAllRead() { await this.repository.markAllRead(); }
  async markRead(id: string) { await this.find(id); await this.repository.markRead(id); }
}
