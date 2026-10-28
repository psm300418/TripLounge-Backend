import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";
import { createSupabaseClient } from "../../config/supabase.js";
import type { SocialProvider } from "./auth.schema.js";
import { AppError } from "../../middlewares/error.middleware.js";

export class AuthRepository {
  private oauthClient(storage: Record<string, string>) {
    return createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: {
      flowType: "pkce", autoRefreshToken: false, detectSessionInUrl: false, persistSession: true,
      storage: {
        getItem: key => storage[key] ?? null,
        setItem: (key, value) => { storage[key] = value; },
        removeItem: key => { delete storage[key]; },
      },
    } });
  }
  async start(provider: SocialProvider, storage: Record<string, string>) {
    const { data, error } = await this.oauthClient(storage).auth.signInWithOAuth({
      provider, options: {
        redirectTo: env.authRedirectUrl,
        skipBrowserRedirect: true,
        // scopes는 기본 권한에 추가되므로 scope로 카카오 기본 이메일 요청을 대체하는 방식임.
        queryParams: provider === "kakao" ? { scope: "profile_nickname profile_image" } : undefined,
      },
    });
    if (error || !data.url) throw new AppError(500, "OAUTH_START_FAILED", "소셜 로그인을 시작할 수 없습니다.");
    return data.url;
  }
  async exchange(code: string, storage: Record<string, string>) {
    const { data, error } = await this.oauthClient(storage).auth.exchangeCodeForSession(code);
    if (error || !data.session) throw new AppError(401, "AUTH_REQUIRED", "소셜 로그인 인증에 실패했습니다.");
    return data.session;
  }
  async refresh(refreshToken: string) {
    const { data, error } = await createSupabaseClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error && (!error.status || error.status >= 500)) throw new AppError(503, "AUTH_UNAVAILABLE", "인증 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.");
    if (error || !data.session) throw new AppError(401, "AUTH_REQUIRED", "세션을 갱신할 수 없습니다.");
    return data.session;
  }
  async logout(accessToken: string) {
    // 사용자 JWT로 로그아웃하며 service-role 키는 불필요한 방식임.
    const response = await fetch(`${env.supabaseUrl}/auth/v1/logout?scope=local`, {
      method: "POST", headers: { apikey: env.supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new AppError(502, "LOGOUT_FAILED", "로그아웃에 실패했습니다.");
  }
}
export const authRepository = new AuthRepository();
