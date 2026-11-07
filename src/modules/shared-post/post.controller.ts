import type { Request, Response } from "express";
import { postService } from "./post.service.js";
import { AppError } from "../../middlewares/error.middleware.js";

export class PostController {
  getPost = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const postId = Number(id);
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(postId)) {
      throw new AppError(400, "INVALID_REQUEST", "유효한 게시글 ID가 아닙니다.");
    }
    const post = await postService.getPostById(postId);
    res.json({ success: true, data: post });
  };
}

export const postController = new PostController();
