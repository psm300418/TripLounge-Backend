import type { Request, Response } from "express";
import { getAuth } from "../../../utils/context.js";
import { FeedRepository } from "./feed.repository.js";
import { FeedService } from "./feed.service.js";
import type { FeedInput, FeedFilter } from "./feed.schema.js";
const service = (res: Response) => new FeedService(new FeedRepository(getAuth(res).supabase, getAuth(res).userId));
export class FeedController {
  list = async (_req: Request, res: Response): Promise<void> => {
    res.json({ success: true, data: await service(res).list(res.locals.query as FeedInput) });
  };
  detail = async (_req: Request, res: Response): Promise<void> => {
    const { id } = res.locals.params as { id: number };
    res.json({ success: true, data: await service(res).getPostById(id) });
  };
  day = async (_req: Request, res: Response): Promise<void> => {
    const { id, dayNumber } = res.locals.params as { id: number; dayNumber: number };
    res.json({ success: true, data: await service(res).day(id, dayNumber) });
  };
  neighbors = async (_req: Request, res: Response): Promise<void> => {
    const { id } = res.locals.params as { id: number };
    const filter = res.locals.query as FeedFilter;
    res.json({ success: true, data: await service(res).neighbors(id, filter) });
  };
}
export const feedController = new FeedController();
