import type { Response } from "express";
import { env } from "../../config/env.js";
import { AppError } from "../../middlewares/error.middleware.js";

const name = "trip_lounge_refresh";
const options = { httpOnly: true, secure: env.nodeEnv === "production", sameSite: "lax" as const, path: "/auth/web" };
export function setRefreshCookie(res: Response, token: string) {
  res.cookie(name, token, { ...options, maxAge: 30 * 24 * 60 * 60 * 1000 });
}
export function clearRefreshCookie(res: Response) { res.clearCookie(name, options); }
export function readRefreshCookie(header?: string): string {
  try {
    const value = header?.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
    if (!value) throw new Error("Missing cookie");
    const token = decodeURIComponent(value);
    if (!token || token.length > 8192 || /\s/.test(token)) throw new Error("Invalid cookie");
    return token;
  } catch { throw new AppError(401, "AUTH_REQUIRED", "로그인을 다시 시작해주세요."); }
}
