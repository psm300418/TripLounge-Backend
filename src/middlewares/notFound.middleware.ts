import type { RequestHandler } from "express";
import { AppError } from "./error.middleware.js";
export const notFoundMiddleware: RequestHandler = (_req, _res, next) =>
  next(new AppError(404, "API_NOT_FOUND", "API를 찾을 수 없습니다."));
