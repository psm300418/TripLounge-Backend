import multer from "multer";
import { AppError } from "./error.middleware.js";

// 파일을 메모리에 임시 보관
const storage = multer.memoryStorage();

// 이미지 파일만 허용하는 필터
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new AppError(400, "INVALID_FILE_TYPE", "이미지 파일만 업로드할 수 있습니다."));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 최대 10MB 크기 제한
  },
});