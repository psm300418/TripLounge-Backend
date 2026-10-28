import type { Request, Response } from "express";
import { authService } from "./auth.service.js";
import { authWebService, publicSession } from "./auth.web.service.js";
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from "./auth.web.cookie.js";
import { oauthCookieName, oauthCookieOptions } from "./auth.cookie.js";
import { getAuth } from "../../utils/context.js";
import { env } from "../../config/env.js";
import { AppError } from "../../middlewares/error.middleware.js";

export class AuthWebController {
  config = (_req: Request, res: Response) => {
    res.json({ success: true, data: { appleEnabled: env.authAppleEnabled } });
  };
  callback = async (req: Request, res: Response) => {
    res.clearCookie(oauthCookieName, { ...oauthCookieOptions, maxAge: undefined });
    const session = await authService.callback(req.body.code as string, req.headers.cookie);
    setRefreshCookie(res, session.refreshToken);
    res.json({ success: true, data: publicSession(session) });
  };
  refresh = async (req: Request, res: Response) => {
    try {
      const session = await authService.refresh(readRefreshCookie(req.headers.cookie));
      setRefreshCookie(res, session.refreshToken);
      res.json({ success: true, data: publicSession(session) });
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 401) clearRefreshCookie(res);
      throw error;
    }
  };
  logout = async (req: Request, res: Response) => {
    let token: string | undefined;
    try { token = readRefreshCookie(req.headers.cookie); }
    catch (error) { if (!(error instanceof AppError && error.statusCode === 401)) throw error; }
    if (token) await authWebService.logout(token, refreshed => setRefreshCookie(res, refreshed));
    clearRefreshCookie(res);
    res.status(204).end();
  };
  profile = async (_req: Request, res: Response) => {
    res.json({ success: true, data: await authWebService.profile(getAuth(res)) });
  };
}
export const authWebController = new AuthWebController();
