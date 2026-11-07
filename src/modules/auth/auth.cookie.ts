import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { env } from "../../config/env.js";
import { AppError } from "../../middlewares/error.middleware.js";

export const oauthCookieName = "trip_lounge_oauth";
export const oauthCookieOptions = { httpOnly: true, secure: env.nodeEnv === "production", sameSite: "lax" as const, path: "/auth", maxAge: 600000 };
const cookieSchema = z.object({ expiresAt: z.number(), storage: z.record(z.string(), z.string()) });
export function sealStorage(storage: Record<string, string>, now = Date.now()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(env.authCookieSecret, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ storage, expiresAt: now + 600000 }), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function openStorage(cookieHeader: string | undefined, now = Date.now()): Record<string, string> {
  try {
    const raw = cookieHeader?.split(";").map(part => part.trim()).find(part => part.startsWith(`${oauthCookieName}=`))?.slice(oauthCookieName.length + 1);
    if (!raw || raw.length > 4096) throw new Error("Missing cookie");
    const bytes = Buffer.from(decodeURIComponent(raw), "base64url");
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(env.authCookieSecret, "hex"), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const payload = cookieSchema.parse(JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8")) as unknown);
    if (payload.expiresAt <= now) throw new Error("Expired cookie");
    return payload.storage;
  } catch { throw new AppError(401, "AUTH_REQUIRED", "로그인을 다시 시작해주세요."); }
}
