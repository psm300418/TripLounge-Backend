begin;

-- Only request participants may read the other participant's public profile.
create function private.list_friend_requests(
  p_direction text default 'RECEIVED', p_status text default 'PENDING',
  p_limit int default 20, p_offset int default 0
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_result jsonb;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_direction is null or p_direction not in ('RECEIVED','SENT')
    or p_status is null or p_status not in ('PENDING','ACCEPTED','REJECTED','CANCELLED')
    or p_limit is null or p_limit not between 1 and 50
    or p_offset is null or p_offset not between 0 and 500000
    then raise exception 'INVALID_REQUEST'; end if;

  with requests as (
    select r.* from public.friend_requests r
    where r.status = p_status and
      ((p_direction = 'RECEIVED' and r.receiver_id = v_user)
       or (p_direction = 'SENT' and r.sender_id = v_user))
  ), page as (
    select * from requests order by created_at desc, id limit p_limit offset p_offset
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(to_jsonb(r) || jsonb_build_object('counterpart',
        jsonb_build_object('id', u.id, 'nickname', u.nickname, 'avatar_url', u.avatar_url))
        order by r.created_at desc, r.id)
      from page r join public.users u on u.id =
        case when p_direction = 'RECEIVED' then r.sender_id else r.receiver_id end
    ), '[]'::jsonb),
    'total', (select count(*) from requests)
  ) into v_result;
  return v_result;
end $$;

revoke all on function private.list_friend_requests(text,text,int,int) from public,anon,authenticated;
grant execute on function private.list_friend_requests(text,text,int,int) to authenticated;

create function public.list_friend_requests(
  p_direction text default 'RECEIVED', p_status text default 'PENDING',
  p_limit int default 20, p_offset int default 0
) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.list_friend_requests(p_direction,p_status,p_limit,p_offset);
$$;
revoke all on function public.list_friend_requests(text,text,int,int) from public,anon,authenticated;
grant execute on function public.list_friend_requests(text,text,int,int) to authenticated;

notify pgrst, 'reload schema';
commit;
