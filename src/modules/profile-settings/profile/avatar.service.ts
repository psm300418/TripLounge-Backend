import { randomUUID } from "node:crypto";
import { AppError } from "../../../middlewares/error.middleware.js";
import { inspectAvatar, avatarMaxBytes, type AvatarImage } from "./avatar.schema.js";
import type { AvatarRepository } from "./avatar.repository.js";

export class AvatarService {
  constructor(private readonly repository: Pick<AvatarRepository, "userId" | "upload" | "setAvatar" | "removeUpload" | "currentAvatar">) {}

  async change(file?: Pick<Express.Multer.File, "buffer">) {
    if (!file?.buffer.length) throw new AppError(400, "INVALID_REQUEST", "프로필 사진을 선택해주세요.");
    if (file.buffer.length > avatarMaxBytes) throw new AppError(413, "IMAGE_TOO_LARGE", "프로필 사진은 5MB 이하여야 합니다.");
    let image: AvatarImage;
    try {
      image = inspectAvatar(file.buffer);
    } catch {
      throw new AppError(400, "INVALID_IMAGE", "정상적인 JPG, PNG, WebP 사진을 선택해주세요. 최대 2,500만 화소까지 지원합니다.");
    }
    const path = `${this.repository.userId}/${randomUUID()}.${image.extension}`;
    const avatarUrl = await this.repository.upload(path, file.buffer, image.contentType);
    try {
      return await this.repository.setAvatar(avatarUrl);
    } catch (error) {
      // 응답만 유실된 경우 이미 저장된 사진을 삭제하지 않는다.
      try {
        const current = await this.repository.currentAvatar();
        if (current?.avatar_url === avatarUrl) return { id: current.id, avatar_url: avatarUrl };
        await this.repository.removeUpload(path);
      }
      catch { console.error("AVATAR_CLEANUP_FAILED", { path }); }
      throw error;
    }
  }
}
