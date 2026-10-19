import type { ErrorRequestHandler } from "express";
import { MulterError } from "multer";

export class AppError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string) {
    super(message);
  }
}
export const errorMiddleware: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  const status = err instanceof AppError ? err.statusCode :
    err instanceof MulterError || err instanceof SyntaxError ? 400 : 500;
  res.status(status).json({ success: false, error: {
    code: err instanceof AppError ? err.code : status === 400 ? "INVALID_REQUEST" : "INTERNAL_SERVER_ERROR",
    message: err instanceof AppError ? err.message : status === 400 ? "잘못된 요청입니다." : "서버 오류가 발생했습니다.",
  } });
};
