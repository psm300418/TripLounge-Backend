begin;
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'PENDING' check(status in ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(sender_id <> receiver_id)
);
create unique index friend_requests_pending_pair_idx on public.friend_requests
  (least(sender_id,receiver_id),greatest(sender_id,receiver_id)) where status = 'PENDING';
create index friend_requests_receiver_idx on public.friend_requests(receiver_id,status,created_at desc);
create index friend_requests_sender_idx on public.friend_requests(sender_id,status,created_at desc);
create table public.user_friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  friend_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id,friend_id), check(user_id < friend_id)
);
create index user_friends_friend_idx on public.user_friends(friend_id);
-- 기존 notifications 테이블을 사용하며 생성·권한·정책을 변경하지 않는다.
create function private.are_friends(p_other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.user_friends where
    user_id = least(auth.uid(),p_other) and friend_id = greatest(auth.uid(),p_other));
$$;
create function private.create_friend_request(p_friend_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_target uuid; v_request public.friend_requests;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_friend_code is null or p_friend_code !~ '^[A-Z0-9]{7}$' then raise exception 'INVALID_REQUEST'; end if;
  select user_id into v_target from public.friend_codes where friend_code = p_friend_code;
  if v_target is null then raise exception 'USER_NOT_FOUND'; end if;
  if v_target = v_user then raise exception 'INVALID_REQUEST'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(v_user,v_target)::text || greatest(v_user,v_target)::text,0));
  if private.are_friends(v_target) then raise exception 'ALREADY_FRIEND'; end if;
  if exists(select 1 from public.friend_requests where status='PENDING' and
    least(sender_id,receiver_id)=least(v_user,v_target) and greatest(sender_id,receiver_id)=greatest(v_user,v_target))
    then raise exception 'ALREADY_REQUESTED'; end if;
  insert into public.friend_requests(sender_id,receiver_id) values(v_user,v_target) returning * into v_request;
  insert into public.notifications(user_id,actor_id,type,friend_request_id) values(v_target,v_user,'FRIEND_REQUEST',v_request.id);
  return to_jsonb(v_request);
end $$;
create function private.respond_friend_request(p_request_id uuid,p_status text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_request public.friend_requests;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_status is null or p_status not in ('ACCEPTED','REJECTED','CANCELLED') then raise exception 'INVALID_REQUEST'; end if;
  select * into v_request from public.friend_requests where id=p_request_id and v_user in(sender_id,receiver_id);
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(v_request.sender_id,v_request.receiver_id)::text || greatest(v_request.sender_id,v_request.receiver_id)::text,0));
  select * into v_request from public.friend_requests where id=p_request_id for update;
  if (p_status='CANCELLED' and v_user<>v_request.sender_id) or
     (p_status<>'CANCELLED' and v_user<>v_request.receiver_id) then raise exception 'FORBIDDEN'; end if;
  if v_request.status<>'PENDING' then raise exception 'ALREADY_PROCESSED'; end if;
  if p_status='ACCEPTED' then
    insert into public.user_friends(user_id,friend_id)
    values(least(v_request.sender_id,v_request.receiver_id),greatest(v_request.sender_id,v_request.receiver_id));
    insert into public.notifications(user_id,actor_id,type,friend_request_id)
    values(v_request.sender_id,v_user,'FRIEND_ACCEPTED',v_request.id);
  end if;
  update public.friend_requests set status=p_status,updated_at=now() where id=p_request_id returning * into v_request;
  update public.notifications set read_at=coalesce(read_at,now()) where friend_request_id=p_request_id and user_id=v_user;
  return to_jsonb(v_request);
end $$;
create function private.remove_friend(p_friend_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_friend_id is null or p_friend_id=v_user then raise exception 'INVALID_REQUEST'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(v_user,p_friend_id)::text || greatest(v_user,p_friend_id)::text,0));
  delete from public.user_friends where user_id=least(v_user,p_friend_id) and friend_id=greatest(v_user,p_friend_id);
  if not found then raise exception 'FRIEND_NOT_FOUND'; end if;
end $$;
create function private.list_friends(p_limit int default 20,p_offset int default 0) returns jsonb
language sql stable security definer set search_path = '' as $$
  with friends as (
    select u.id,u.nickname,u.avatar_url,f.created_at from public.user_friends f
    join public.users u on u.id = case when f.user_id=auth.uid() then f.friend_id else f.user_id end
    where auth.uid() in (f.user_id,f.friend_id)
  ), page as (select * from friends order by created_at desc,id limit least(greatest(p_limit,1),50) offset greatest(p_offset,0))
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from friends));
$$;
alter table public.friend_requests enable row level security;
alter table public.user_friends enable row level security;

revoke all on public.friend_requests,public.user_friends from anon,authenticated;
grant select on public.friend_requests,public.user_friends to authenticated;

create policy requests_participant_read on public.friend_requests for select to authenticated using((select auth.uid()) in(sender_id,receiver_id));
create policy friends_participant_read on public.user_friends for select to authenticated using((select auth.uid()) in(user_id,friend_id));
revoke all on function private.are_friends(uuid),private.create_friend_request(text),private.respond_friend_request(uuid,text),private.remove_friend(uuid),private.list_friends(int,int) from public;
grant execute on function private.are_friends(uuid),private.create_friend_request(text),private.respond_friend_request(uuid,text),private.remove_friend(uuid),private.list_friends(int,int) to authenticated;
create function public.create_friend_request(p_friend_code text) returns jsonb language sql security invoker set search_path = '' as $$ select private.create_friend_request(p_friend_code); $$;
revoke all on function public.create_friend_request(text) from public,anon;
grant execute on function public.create_friend_request(text) to authenticated;
create function public.respond_friend_request(p_request_id uuid,p_status text) returns jsonb language sql security invoker set search_path = '' as $$ select private.respond_friend_request(p_request_id,p_status); $$;
revoke all on function public.respond_friend_request(uuid,text) from public,anon;
grant execute on function public.respond_friend_request(uuid,text) to authenticated;
create function public.remove_friend(p_friend_id uuid) returns void language sql security invoker set search_path = '' as $$ select private.remove_friend(p_friend_id); $$;
revoke all on function public.remove_friend(uuid) from public,anon;
grant execute on function public.remove_friend(uuid) to authenticated;
commit;
