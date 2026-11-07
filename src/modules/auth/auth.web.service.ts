import { authService } from "./auth.service.js";
import { AppError } from "../../middlewares/error.middleware.js";
import { AuthProfileRepository } from "./auth.profile.repository.js";
import type { AuthContext } from "../../utils/context.js";

export const publicSession = (session: Awaited<ReturnType<typeof authService.refresh>>) => ({
  accessToken: session.accessToken, expiresAt: session.expiresAt, tokenType: session.tokenType, user: session.user,
});
export class AuthWebService {
  async logout(refreshToken: string, onRefresh: (token: string) => void) {
    try {
      const session = await authService.refresh(refreshToken);
      onRefresh(session.refreshToken);
      await authService.logout(session.accessToken);
    } catch (error) {
      if (!(error instanceof AppError && error.statusCode === 401)) throw error;
    }
  }
  async profile(auth: AuthContext) { return new AuthProfileRepository(auth.supabase).find(auth.userId); }
}
export const authWebService = new AuthWebService();
