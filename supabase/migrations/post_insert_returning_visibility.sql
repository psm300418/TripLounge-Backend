begin;
-- 저장 직후 반환할 행을 재조회 없이 권한 검사하는 방식임.
-- STABLE 함수는 같은 명령에서 방금 저장한 행을 볼 수 없는 특성임.
alter policy tl_read_allow on public.posts using (
  user_id=(select auth.uid()) or private.can_view_post(id)
);
alter policy tl_read_guard on public.posts using (
  user_id=(select auth.uid()) or private.can_view_post(id)
);
commit;
