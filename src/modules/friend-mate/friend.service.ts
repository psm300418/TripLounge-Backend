import type { FriendRepository } from "./friend.repository.js";
import type { FriendRequestQuery, FriendRequestStatus } from "./friend.schema.js";
import { AppError } from "../../middlewares/error.middleware.js";
export class FriendService {
  constructor(private readonly repository: FriendRepository, private readonly userId: string) {}
  async code() { return this.repository.code(); }
  async list(page: number, limit: number, q: string) { return this.repository.list(page, limit, q); }
  async requests(input: FriendRequestQuery) { return this.repository.requests(input); }
  async createRequest(friendCode: string) {
    const own = await this.repository.code();
    if (own.friendCode === friendCode) throw new AppError(400, "INVALID_REQUEST", "자신에게 친구 요청을 보낼 수 없습니다.");
    return this.repository.createRequest(friendCode);
  }
  async respond(id: string, status: FriendRequestStatus) { return this.repository.respond(id, status); }
  async remove(friendId: string) {
    if (friendId === this.userId) throw new AppError(400, "INVALID_REQUEST", "자신을 삭제할 수 없습니다.");
    await this.repository.remove(friendId);
  }
}
