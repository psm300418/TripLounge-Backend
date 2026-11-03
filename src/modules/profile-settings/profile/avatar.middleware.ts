import multer from "multer";
import type { RequestHandler } from "express";
import { AppError } from "../../../middlewares/error.middleware.js";
import { avatarMaxBytes } from "./avatar.schema.js";

const receive = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: avatarMaxBytes, files: 1, fields: 0, parts: 1 },
}).single("image");

export const receiveAvatar: RequestHandler = (req, res, next) => {
  receive(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      next(new AppError(error.code === "LIMIT_FILE_SIZE" ? 413 : 400,
        error.code === "LIMIT_FILE_SIZE" ? "IMAGE_TOO_LARGE" : "INVALID_REQUEST",
        error.code === "LIMIT_FILE_SIZE" ? "프로필 사진은 5MB 이하여야 합니다." : "image 항목에 사진 한 장만 보내주세요."));
      return;
    }
    next(error);
  });
};
