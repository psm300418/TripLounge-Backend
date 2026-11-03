import type { ProfileRepository } from "./profile.repository.js";
import type { UpdateProfileInput } from "./profile.schema.js";
import { AppError } from "../../../middlewares/error.middleware.js";
export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}
  async getMe() {
    const profile = await this.repository.find();
    if (!profile) throw new AppError(404, "USER_NOT_FOUND", "프로필을 찾을 수 없습니다.");
    return profile;
  }
  async updateMe(input: UpdateProfileInput) {
    const profile = await this.repository.update(input);
    if (!profile) throw new AppError(404, "USER_NOT_FOUND", "프로필을 찾을 수 없습니다.");
    return profile;
  }
}
