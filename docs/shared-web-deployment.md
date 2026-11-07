# 공유 웹 서버 (feature/post-test)

이 브랜치는 `GET /health`, `GET /posts/:id`만 제공한다. HEAD는 GET과 같은 조회로 처리되고 OPTIONS는 CORS에서 응답한다. 작성·사진 업로드·수정·삭제와 로그인 경로는 없다.

## DB 준비

통합 Supabase SQL Editor에서 `supabase/migrations/005_shared_post_readonly.sql`만 검토 후 실행한다. 기존 `001_create_posts_table.sql`, `posts_tset.sql`은 테이블 초기화·익명 쓰기 권한을 포함한 과거 테스트 스크립트이므로 통합 DB에서 실행하지 않는다.

새 함수 `get_shared_post`는 PUBLIC 글 한 건과 일차·사진·좌표·작성자 닉네임 및 사진만 반환한다. 동행자의 UUID 목록은 노출하지 않는다. 존재하지 않는 글과 비공개 글은 모두 404다. 테이블 정책과 권한은 변경하지 않는다. 이 SQL은 기존에 열린 익명 쓰기 정책을 제거하지 않으므로, 과거 테스트 SQL을 실행한 DB라면 팀의 권한 검토가 별도로 필요하다.

## Render

- 저장소: TripLounge-Backend, 브랜치: feature/post-test
- Build: `npm ci --include=dev && npm run build`
- Start: `node dist/server.js`
- NODE_ENV=production
- CLIENT_ORIGIN=https://triplounge-web.onrender.com
- SUPABASE_URL 및 SUPABASE_ANON_KEY는 본 앱과 같은 통합 프로젝트 값 사용
- 기존 설정 스키마 때문에 NAVER_MAPS_API_KEY_ID, NAVER_MAPS_API_KEY도 필요하다. 공유 조회 자체는 역지오코딩을 호출하지 않는다.
- PORT는 Render 기본값 사용

프론트 Static Site Environment의 `EXPO_PUBLIC_SHARE_API_URL`을 이 서버의 HTTPS 주소로 지정하고 재배포한다. `EXPO_PUBLIC_BACKEND_URL`은 develop 서버 주소를 유지한다. `/share/*` → `/share/[id].html` Rewrite도 유지한다.

## 확인

`npm run typecheck`, `npm run build`, `npm test`로 검사한다. 테스트는 Supabase HTTP 응답을 모의 처리하며 실제 DB SQL 실행과 두 계정 간 저장 테스트를 대신하지 않는다. 외부에서 전체공개 글 200, 비공개·없는 글 404, POST/PATCH/DELETE 404를 확인한다.
