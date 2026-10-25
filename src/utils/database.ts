import { AppError } from "../middlewares/error.middleware.js";
type DbError = { code?: string; message: string };
export function checkDb(error: DbError | null): void {
  if (!error) return;
  const messages: Record<string, [number, string]> = {
    AUTH_REQUIRED: [401, "로그인이 필요합니다."], FORBIDDEN: [403, "접근 권한이 없습니다."],
    POST_NOT_FOUND: [404, "게시글을 찾을 수 없습니다."],
    USER_NOT_FOUND: [404, "사용자를 찾을 수 없습니다."], REQUEST_NOT_FOUND: [404, "친구 요청을 찾을 수 없습니다."],
    FRIEND_NOT_FOUND: [404, "친구를 찾을 수 없습니다."], ALREADY_FRIEND: [409, "이미 메이트입니다."],
    ALREADY_REQUESTED: [409, "처리 중인 친구 요청이 있습니다."], ALREADY_PROCESSED: [409, "이미 처리된 요청입니다."],
    INVALID_REQUEST: [400, "잘못된 요청입니다."],
  };
  const known = messages[error.message];
  if (known) throw new AppError(known[0], error.message, known[1]);
  if (error.code === "23505") throw new AppError(409, "ALREADY_EXISTS", "이미 존재하는 데이터입니다.");
  if (error.code === "42501") throw new AppError(403, "FORBIDDEN", "접근 권한이 없습니다.");
  throw new AppError(500, "INTERNAL_SERVER_ERROR", "데이터 처리에 실패했습니다.");
}
