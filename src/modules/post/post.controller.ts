import type { Request, Response } from "express";
import { postService } from "./post.service.js";
import type { CreatePostInput, UpdatePostInput } from "./post.schema.js";
import { AppError } from "../../middlewares/error.middleware.js";

export class PostController {

  // 게시글 작성 요청
  createPost = async (req: Request, res: Response): Promise<void> => {
    // 클라이언트가 보낸 데이터 꺼내기 
    const body = req.body as CreatePostInput;

    // 작성자 ID 가져오기
    // 지금은 개발 단계이므로 임시 UUID를 넣음 추후 로그인 연동 시 req에서 꺼냄
    const userId = "3f6b5383-2320-410f-8bf0-bff7b166e6be"; 

    // Service 호출
    const newPost = await postService.createPost(userId, body);

    // 201 Created 상태 코드와 함께 성공 응답 반환
    res.status(201).json({
      success: true,
      data: newPost,
    });
  };



  // 이미지 업로드 
  uploadImage = async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    // Service에서 URL + 메타데이터 받기
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

    const post = await postService.getPostById(postId);

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

    await postService.deletePost(postId);

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

    const body = req.body as UpdatePostInput;
    const updatedPost = await postService.updatePost(postId, body);

    res.status(200).json({
      success: true,
      data: updatedPost,
    });
  };

}

export const postController = new PostController();