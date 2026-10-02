import type { Request, Response } from "express";
import { postService } from "./post.service.js";
import type { CreatePostInput } from "./post.schema.js";

export class PostController {

  // 게시글 작성 요청 처리
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
}

export const postController = new PostController();