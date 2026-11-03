import type { Request, Response } from "express";
import { getAuth } from "../../utils/context.js";
import { FriendRepository } from "./friend.repository.js";
import { FriendService } from "./friend.service.js";
import type { FriendRequestQuery, FriendRequestStatus } from "./friend.schema.js";
const service = (res: Response) => {
  const { supabase, userId } = getAuth(res); return new FriendService(new FriendRepository(supabase, userId), userId);
};
export class FriendController {
  code = async (_req: Request, res: Response): Promise<void> => { res.json({ success: true, data: await service(res).code() }); };
  list = async (_req: Request, res: Response): Promise<void> => {
    const { page, limit, q } = res.locals.query as { page: number; limit: number; q: string };
    res.json({ success: true, data: await service(res).list(page, limit, q) });
  };
  requests = async (_req: Request, res: Response): Promise<void> => {
    res.json({ success: true, data: await service(res).requests(res.locals.query as FriendRequestQuery) });
  };
  createRequest = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json({ success: true, data: await service(res).createRequest((req.body as { friendCode: string }).friendCode) });
  };
  respond = async (req: Request, res: Response): Promise<void> => {
    res.json({ success: true, data: await service(res).respond((res.locals.params as { id: string }).id, (req.body as { status: FriendRequestStatus }).status) });
  };
  remove = async (_req: Request, res: Response): Promise<void> => {
    await service(res).remove((res.locals.params as { id: string }).id); res.status(204).end();
  };
}
export const friendController = new FriendController();
