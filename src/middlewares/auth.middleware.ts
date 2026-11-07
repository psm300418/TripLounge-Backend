import type { RequestHandler } from "express";
import { createSupabaseClient, supabase } from "../config/supabase.js";
import { AppError } from "./error.middleware.js";

export const authMiddleware: RequestHandler = async (req, res, next) => {
  try {
    const match = /^Bearer (\S+)$/i.exec(req.headers.authorization ?? "");
    if (!match) throw new AppError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
    const accessToken = match[1];
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) throw new AppError(401, "AUTH_REQUIRED", "인증 정보가 만료되었거나 유효하지 않습니다.");
    res.locals.auth = { userId: data.user.id, accessToken, supabase: createSupabaseClient(accessToken) };
    next();
  } catch (error) { next(error); }
};
