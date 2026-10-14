import { Router } from "express";
import { postController } from "./post.controller.js";
import { createPostSchema, updatePostSchema } from "./post.schema.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { upload } from "../../middlewares/upload.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const postRouter = Router();

// POST 요청 /posts (게시글 작성)
postRouter.post(
  "/",
  authMiddleware,                        
  validate({ body: createPostSchema }),  
  asyncHandler(postController.createPost) 
);

// POST 요청 /posts/images (이미지 단건 업로드)
postRouter.post(
  "/images",
  authMiddleware,                 
  upload.single("image"),         
  asyncHandler(postController.uploadImage)
);

// GET 요청 /posts/:id (게시글 조회)
postRouter.get(
  "/:id",
  authMiddleware,
  asyncHandler(postController.getPost)
);

// DELETE 요청 /posts/:id (게시글 삭제)
postRouter.delete(
  "/:id",
  authMiddleware,
  asyncHandler(postController.deletePost)
);

// PATCH 요청 /posts/:id (게시글 수정)
postRouter.patch(
  "/:id",
  authMiddleware,
  validate({ body: updatePostSchema }),
  asyncHandler(postController.updatePost)
);