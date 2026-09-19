import type { RequestHandler } from "express";

import { AppError } from "./error.middleware.js";

export const authMiddleware: RequestHandler = (req, _res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    next(new AppError(401, "AUTH_REQUIRED", "Authentication is required."));
    return;
  }

  next();
};
