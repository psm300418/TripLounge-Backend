import { Router } from "express";
import { env } from "../../config/env.js";
import { AppError } from "../../middlewares/error.middleware.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { callbackSchema } from "./auth.schema.js";
import { authWebController } from "./auth.web.controller.js";

export const authWebRouter = Router();
authWebRouter.use((req, _res, next) => {
  // Cookie-backed mutations must originate from the configured frontend.
  if (req.method !== "GET" && req.headers.origin !== env.clientOrigin) {
    next(new AppError(403, "FORBIDDEN", "허용되지 않은 요청 출처입니다.")); return;
  }
  next();
});
authWebRouter.get("/config", authWebController.config);
authWebRouter.post("/session", validate({ body: callbackSchema }), asyncHandler(authWebController.callback));
authWebRouter.post("/session/refresh", asyncHandler(authWebController.refresh));
authWebRouter.post("/logout", asyncHandler(authWebController.logout));
authWebRouter.get("/me", authMiddleware, asyncHandler(authWebController.profile));
