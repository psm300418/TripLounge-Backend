-- 001~009 적용 후 실행하며 게시글·좋아요 테이블은 재생성하지 않는 SQL임.
begin;
alter table public.post_likes enable row level security;
revoke all on public.post_likes from anon,authenticated;
grant select,insert,delete on public.post_likes to authenticated;
create unique index if not exists tl_post_likes_pair_idx on public.post_likes(post_id,user_id);
create index if not exists post_likes_user_id_idx on public.post_likes(user_id);

-- 기존 UUID 또는 BIGINT 자동 생성 ID를 그대로 보존하는 처리임.
do $$ declare v_sequence text; begin
  v_sequence := pg_get_serial_sequence('public.post_likes','id');
  if v_sequence is not null then
    execute format('grant usage,select on sequence %s to authenticated',v_sequence);
  end if;
end $$;

-- 다른 작업자의 허용 정책에도 접근 제한을 적용하는 설정임.
drop policy if exists tl_likes_read_guard on public.post_likes;
create policy tl_likes_read_guard on public.post_likes as restrictive for select to authenticated using(private.can_view_post(post_id));
drop policy if exists tl_likes_insert_guard on public.post_likes;
create policy tl_likes_insert_guard on public.post_likes as restrictive for insert to authenticated
  with check(user_id=(select auth.uid()) and private.can_view_post(post_id));
drop policy if exists tl_likes_delete_guard on public.post_likes;
create policy tl_likes_delete_guard on public.post_likes as restrictive for delete to authenticated using(user_id=(select auth.uid()));

create or replace function public.get_post_like_summary(p_post_id bigint) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_summary jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_post_id is null or p_post_id<=0 then raise exception 'INVALID_REQUEST'; end if;
  if not exists(select 1 from public.posts where id=p_post_id) then raise exception 'POST_NOT_FOUND'; end if;
  select jsonb_build_object('likeCount',count(*),'likedByMe',coalesce(bool_or(user_id=auth.uid()),false))
    into v_summary from public.post_likes where post_id=p_post_id;
  return v_summary;
end $$;

-- 공개 범위나 친구 관계가 바뀌어도 본인 좋아요는 취소할 수 있는 처리임.
create or replace function public.remove_post_like(p_post_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_post_id is null or p_post_id<=0 then raise exception 'INVALID_REQUEST'; end if;
  delete from public.post_likes where post_id=p_post_id and user_id=auth.uid();
end $$;

create or replace function private.notify_post_like() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.posts where id=new.post_id;
  if v_owner is not null and v_owner<>new.user_id then
    perform pg_advisory_xact_lock(hashtextextended('post-like:' || new.post_id::text || ':' || new.user_id::text,0));
    if not exists(select 1 from public.notifications where user_id=v_owner and actor_id=new.user_id
      and type='POST_LIKE' and post_id=new.post_id and read_at is null) then
      insert into public.notifications(user_id,actor_id,type,post_id) values(v_owner,new.user_id,'POST_LIKE',new.post_id);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists post_like_notification on public.post_likes;
create trigger post_like_notification after insert on public.post_likes for each row execute function private.notify_post_like();

revoke all on function public.get_post_like_summary(bigint),public.remove_post_like(bigint),private.notify_post_like() from public,anon,authenticated;
grant execute on function public.get_post_like_summary(bigint),public.remove_post_like(bigint) to authenticated;
create or replace function public.list_feed(p_sort text default 'LATEST',p_scope text default 'ALL',p_query text default '',p_limit int default 20,p_offset int default 0)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_result jsonb;
begin
  if p_sort is null or p_sort not in ('LATEST','POPULAR') or p_limit is null or p_limit not between 1 and 50 or p_offset is null or p_offset not between 0 and 500000 then raise exception 'INVALID_REQUEST'; end if;
  with entries as materialized (select * from private.feed_entries(p_scope,p_query)), page as (
    select * from entries order by case when p_sort='POPULAR' then like_count end desc,created_at desc,post_id desc limit p_limit offset p_offset
  ) select jsonb_build_object('items',coalesce((select jsonb_agg(item || jsonb_build_object('likeCount',like_count,'likedByMe',item->'liked') order by case when p_sort='POPULAR' then like_count end desc,created_at desc,post_id desc) from page),'[]'::jsonb),
    'total',(select count(*) from entries),'limit',p_limit,'offset',p_offset) into v_result;
  return v_result;
end $$;
commit;
