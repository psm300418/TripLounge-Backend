begin;
create function private.search_friends(p_query text default '',p_limit int default 20,p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_query text; v_result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_query is null or length(p_query)>100 or p_limit is null or p_limit not between 1 and 50 or p_offset is null or p_offset not between 0 and 500000 then raise exception 'INVALID_REQUEST'; end if;
  v_query := '%' || replace(replace(replace(p_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  with friends as (
    select u.id,u.nickname,u.avatar_url,f.created_at from public.user_friends f
    join public.users u on u.id=case when f.user_id=auth.uid() then f.friend_id else f.user_id end
    where auth.uid() in(f.user_id,f.friend_id) and u.nickname ilike v_query
  ), page as (select * from friends order by created_at desc,id limit p_limit offset p_offset)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc,id) from page),'[]'::jsonb),
    'total',(select count(*) from friends),'limit',p_limit,'offset',p_offset) into v_result;
  return v_result;
end $$;
revoke all on function private.search_friends(text,int,int) from public,anon;
grant execute on function private.search_friends(text,int,int) to authenticated;
create function public.search_friends(p_query text default '',p_limit int default 20,p_offset int default 0) returns jsonb language sql stable security invoker set search_path = '' as $$ select private.search_friends(p_query,p_limit,p_offset); $$;
revoke all on function public.search_friends(text,int,int) from public,anon;
grant execute on function public.search_friends(text,int,int) to authenticated;
commit;
