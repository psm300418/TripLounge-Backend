import { Router } from "express";
import { postController } from "./post.controller.js";
import { createPostSchema } from "./post.schema.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const postRouter = Router();

// POST /posts 게시글 작성
postRouter.post(
  "/",
  authMiddleware,                        
  validate({ body: createPostSchema }),  
  asyncHandler(postController.createPost) 
);