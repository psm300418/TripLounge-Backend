import type { Request, Response } from "express";
import { authService } from "./auth.service.js";
import type { SocialProvider } from "./auth.schema.js";
import { oauthCookieName, oauthCookieOptions } from "./auth.cookie.js";
import { getAuth } from "../../utils/context.js";
export class AuthController {
  start = async (_req: Request, res: Response): Promise<void> => {
    const { provider } = res.locals.params as { provider: SocialProvider };
    const { url, cookie } = await authService.start(provider);
    res.cookie(oauthCookieName, cookie, oauthCookieOptions).json({ success: true, data: { url } });
  };
  callback = async (req: Request, res: Response): Promise<void> => {
    res.clearCookie(oauthCookieName, { ...oauthCookieOptions, maxAge: undefined });
    const { code } = req.body as { code: string };
    res.json({ success: true, data: await authService.callback(code, req.headers.cookie) });
  };
  refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body as { refreshToken: string };
    res.json({ success: true, data: await authService.refresh(refreshToken) });
  };
  logout = async (_req: Request, res: Response): Promise<void> => {
    await authService.logout(getAuth(res).accessToken);
    res.status(204).end();
  };
}
export const authController = new AuthController();
