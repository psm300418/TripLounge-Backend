import type { Request, Response } from "express";
import { getAuth } from "../../../utils/context.js";
import { FeedRepository } from "./feed.repository.js";
import { FeedService } from "./feed.service.js";
import type { FeedInput } from "./feed.schema.js";
const service = (res: Response) => new FeedService(new FeedRepository(getAuth(res).supabase));
export class FeedController {
  list = async (_req: Request, res: Response): Promise<void> => {
    res.json({ success: true, data: await service(res).list(res.locals.query as FeedInput) });
  };
  detail = async (_req: Request, res: Response): Promise<void> => {
    const { id } = res.locals.params as { id: number };
    res.json({ success: true, data: await service(res).getPostById(id) });
  };
  neighbors = async (_req: Request, res: Response): Promise<void> => {
    const { id } = res.locals.params as { id: number };
    const { scope } = res.locals.query as { scope: "ALL" | "MATES" };
    res.json({ success: true, data: await service(res).neighbors(id, scope) });
  };
}
export const feedController = new FeedController();
