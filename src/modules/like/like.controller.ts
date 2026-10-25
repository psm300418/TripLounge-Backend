import type { Request, Response } from "express";
import { getAuth } from "../../utils/context.js";
import type { LikePostParams } from "./like.schema.js";
import { likeService } from "./like.service.js";

export class LikeController {
  getLikeSummary = async (_req: Request, res: Response): Promise<void> => {
    const { postId } = res.locals.params as LikePostParams;
    const { userId, supabase: userClient } = getAuth(res);
    res.json({ success: true, data: await likeService.getLikeSummary(postId, userId, userClient) });
  };

  // 게시글 좋아요 등록
  likePost = async (_req: Request, res: Response): Promise<void> => {
    const { postId } = res.locals.params as LikePostParams;
    const { userId, supabase: userClient } = getAuth(res);

    await likeService.likePost(postId, userId, userClient);
    res.status(204).send();
  };

  // 게시글 좋아요 취소
  unlikePost = async (_req: Request, res: Response): Promise<void> => {
    const { postId } = res.locals.params as LikePostParams;
    const { userId, supabase: userClient } = getAuth(res);

    await likeService.unlikePost(postId, userId, userClient);
    res.status(204).send();
  };
}

export const likeController = new LikeController();
