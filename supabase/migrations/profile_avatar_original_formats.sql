begin;
-- 기존 WebP 파일과 권한 정책은 유지하고 업로드 가능 형식만 추가한다.
do $$ begin
  if not exists(select 1 from storage.buckets where id='profile-avatars') then
    raise exception 'Apply profile_avatar_storage before this migration';
  end if;
end $$;
update storage.buckets
set allowed_mime_types=array['image/jpeg','image/png','image/webp']
where id='profile-avatars';
commit;
