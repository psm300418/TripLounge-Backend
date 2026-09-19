import type { RequestHandler } from "express";

import { AppError } from "./error.middleware.js";

export const notFoundMiddleware: RequestHandler = (req, _res, next) => {
  next(new AppError(404, "NOT_FOUND", `Cannot ${req.method} ${req.originalUrl}`));
};
