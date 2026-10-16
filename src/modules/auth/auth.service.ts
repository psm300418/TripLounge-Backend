import type { Session } from "@supabase/supabase-js";
import { authRepository, type AuthRepository } from "./auth.repository.js";
import type { SocialProvider } from "./auth.schema.js";
import { sealStorage, openStorage } from "./auth.cookie.js";

const sessionData = (session: Session) => ({
  accessToken: session.access_token, refreshToken: session.refresh_token,
  expiresAt: session.expires_at, tokenType: session.token_type,
  user: { id: session.user.id, email: session.user.email },
});
export class AuthService {
  constructor(private readonly repository: AuthRepository = authRepository) {}
  async start(provider: SocialProvider) {
    const storage: Record<string, string> = {};
    const url = await this.repository.start(provider, storage);
    return { url, cookie: sealStorage(storage) };
  }
  async callback(code: string, cookieHeader?: string) {
    return sessionData(await this.repository.exchange(code, openStorage(cookieHeader)));
  }
  async refresh(refreshToken: string) { return sessionData(await this.repository.refresh(refreshToken)); }
  async logout(accessToken: string) { await this.repository.logout(accessToken); }
}
export const authService = new AuthService();
