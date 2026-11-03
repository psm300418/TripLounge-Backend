import type { Request, Response } from "express";
import { getAuth } from "../../../utils/context.js";
import { AvatarRepository } from "./avatar.repository.js";
import { AvatarService } from "./avatar.service.js";

export const changeAvatar = async (req: Request, res: Response): Promise<void> => {
  const { supabase, userId } = getAuth(res);
  const data = await new AvatarService(new AvatarRepository(supabase, userId)).change(req.file);
  res.json({ success: true, data });
};
