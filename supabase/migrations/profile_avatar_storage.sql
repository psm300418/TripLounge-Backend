begin;

-- 기존 사용자 테이블과 본인 조회/수정 RLS가 있는 DB에 한 번 적용한다.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('profile-avatars','profile-avatars',true,5242880,array['image/webp'])
on conflict(id) do nothing;

do $$ begin
  if not exists(select 1 from storage.buckets where id='profile-avatars'
    and public=true and file_size_limit=5242880 and allowed_mime_types=array['image/webp']) then
    raise exception 'Existing profile-avatars bucket has different settings; review it before applying';
  end if;
end $$;

create policy profile_avatar_insert on storage.objects for insert to authenticated
with check(bucket_id='profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_avatar_select on storage.objects for select to authenticated
using(bucket_id='profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_avatar_delete on storage.objects for delete to authenticated
using(bucket_id='profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- 다른 버킷 정책이 넓게 허용되어 있어도 프로필 경로의 소유권은 지킨다.
create policy profile_avatar_owner_guard on storage.objects as restrictive for all to public
using(bucket_id <> 'profile-avatars' or
  ((select auth.uid()) is not null and (storage.foldername(name))[1]=(select auth.uid())::text))
with check(bucket_id <> 'profile-avatars' or
  ((select auth.uid()) is not null and (storage.foldername(name))[1]=(select auth.uid())::text));

grant update(avatar_url) on public.users to authenticated;
commit;
