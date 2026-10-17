import type { Request, Response } from "express";
import { getAuth } from "../../../utils/context.js";
import { FeedRepository } from "../feed/feed.repository.js";
import { FeedService } from "../feed/feed.service.js";
import { NotificationRepository } from "./notification.repository.js";
import { NotificationService } from "./notification.service.js";
const service = (res: Response) => {
  const { supabase, userId } = getAuth(res);
  return new NotificationService(new NotificationRepository(supabase, userId), new FeedService(new FeedRepository(supabase)));
};
export class NotificationController {
  list = async (_req: Request, res: Response): Promise<void> => {
    const { page, limit } = res.locals.query as { page: number; limit: number };
    res.json({ success: true, data: await service(res).list(page, limit) });
  };
  target = async (_req: Request, res: Response): Promise<void> => {
    res.json({ success: true, data: await service(res).target((res.locals.params as { id: string }).id) });
  };
  markRead = async (_req: Request, res: Response): Promise<void> => {
    await service(res).markRead((res.locals.params as { id: string }).id); res.status(204).end();
  };
}
export const notificationController = new NotificationController();
