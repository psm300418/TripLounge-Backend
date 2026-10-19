import type { Request, Response } from "express";
import { postService } from "./post.service.js";
import type { CreatePostInput, UpdatePostInput } from "./post.schema.js";
import { AppError } from "../../middlewares/error.middleware.js";
import { getAuth } from "../../utils/context.js";

export class PostController {

  // 게시글 작성 요청
  createPost = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreatePostInput;

    const { userId, supabase: userClient } = getAuth(res);

    const newPost = await postService.createPost(userId, body, userClient);

    res.status(201).json({
      success: true,
      data: newPost,
    });
  };



  // 이미지 업로드 요청
  uploadImage = async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    const result = await postService.uploadImage(file);

    res.status(201).json({
      success: true,
      data: result,
    });
  };



  // 게시글 조회 요청 
  getPost = async (req: Request, res: Response): Promise<void> => {
    const postId = Number(req.params.id);

    if (Number.isNaN(postId)) {
      throw new AppError(400, "INVALID_REQUEST", "유효한 게시글 ID가 아닙니다.");
    }

    const { supabase: userClient } = getAuth(res);
    const post = await postService.getPostById(postId, userClient);

    res.status(200).json({
      success: true,
      data: post,
    });
  };



  // 게시글 삭제 요청
  deletePost = async (req: Request, res: Response): Promise<void> => {
    const postId = Number(req.params.id);

    if (Number.isNaN(postId)) {
      throw new AppError(400, "INVALID_REQUEST", "유효한 게시글 ID가 아닙니다.");
    }

    const { userId, supabase: userClient } = getAuth(res);
    await postService.deletePost(postId, userId, userClient);

    res.status(200).json({
      success: true,
      data: null,
    });
  };
  


  // 게시글 수정 요청
  updatePost = async (req: Request, res: Response): Promise<void> => {
    const postId = Number(req.params.id);

    if (Number.isNaN(postId)) {
      throw new AppError(400, "INVALID_REQUEST", "유효한 게시글 ID가 아닙니다.");
    }

    const { userId, supabase: userClient } = getAuth(res);
    const body = req.body as UpdatePostInput;
    const updatedPost = await postService.updatePost(postId, userId, body, userClient);

    res.status(200).json({
      success: true,
      data: updatedPost,
    });
  };

}

export const postController = new PostController();