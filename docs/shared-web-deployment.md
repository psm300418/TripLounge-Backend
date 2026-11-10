# 공유 웹 API 통합

앱 API `/posts`의 인증과 작성·수정·삭제 기능은 유지한다. 공유 웹은 `GET /shared/posts/:id`로 PUBLIC 일기 한 건만 읽는다. 공유 경로의 POST/PATCH/DELETE는 404다.

통합 Supabase SQL Editor에서 `supabase/migrations/005_shared_post_readonly.sql`을 검토 후 실행해야 한다. 기존 테이블과 RLS 정책을 변경하지 않고 공개 조회 함수만 추가한다. 이 SQL은 과거 테스트용 익명 쓰기 정책까지 제거하지 않으므로 기존 DB 권한은 팀에서 별도로 확인한다. 옛 초기화 SQL은 실행하지 않는다.

Render develop 서버: `npm ci --include=dev && npm run build`, `node dist/server.js`.
프론트 `EXPO_PUBLIC_SHARE_API_URL`은 develop 서버의 HTTPS origin을 지정하고 재배포한다. 프론트 호출 경로는 `/shared/posts/:id`다.

`npm run typecheck`, `npm run build`, `npm test`로 조회·권한 모의 응답 테스트를 실행한다. 실제 DB SQL 실행·배포는 별도다.
