import type { Request, Response } from "express";
import { getAuth } from "../../../utils/context.js";
import { ProfileRepository } from "./profile.repository.js";
import { ProfileService } from "./profile.service.js";
import type { UpdateProfileInput } from "./profile.schema.js";
const service = (res: Response) => {
  const { supabase, userId } = getAuth(res); return new ProfileService(new ProfileRepository(supabase, userId));
};
export class ProfileController {
  getMe = async (_req: Request, res: Response): Promise<void> => { res.json({ success: true, data: await service(res).getMe() }); };
  updateMe = async (req: Request, res: Response): Promise<void> => {
    res.json({ success: true, data: await service(res).updateMe(req.body as UpdateProfileInput) });
  };
}
export const profileController = new ProfileController();
