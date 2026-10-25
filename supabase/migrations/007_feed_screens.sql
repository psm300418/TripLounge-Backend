begin;
-- Only display names and avatars of people in an accessible post are exposed.
create or replace function public.get_post_people(p_post_id bigint) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'author', (select jsonb_build_object('id',u.id,'nickname',u.nickname,'avatar_url',u.avatar_url) from public.users u where u.id=p.user_id),
    'mates', coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'nickname',u.nickname,'avatar_url',u.avatar_url) order by u.id)
      from public.users u where exists(select 1 from public.post_members m where m.post_id=p.id and m.user_id=u.id)), '[]'::jsonb))
  from public.posts p where p.id=p_post_id and private.can_view_post(p.id);
$$;
create or replace function private.feed_entries(p_scope text,p_query text)
returns table(post_id bigint,item jsonb,like_count bigint,created_at timestamptz)
language plpgsql stable security invoker set search_path = '' as $$
declare v_query text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_scope is null or p_scope not in ('ALL','MATES','ME') or p_query is null or length(p_query)>100 then raise exception 'INVALID_REQUEST'; end if;
  v_query := '%' || replace(replace(replace(p_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  return query
  select p.id, to_jsonb(p) || people.info || jsonb_build_object(
    'title',(select d.title from public.post_days d where d.post_id=p.id order by d.day_number,d.id limit 1),
    'image_url',(select ph.image_url from public.post_days d join public.post_photos ph on ph.post_day_id=d.id where d.post_id=p.id order by d.day_number,d.id,ph.order_index,ph.id limit 1),
    'preview_images',coalesce((select jsonb_agg(images.image_url order by images.day_number,images.day_id,images.order_index,images.id)
      from (select ph.image_url,d.day_number,d.id as day_id,ph.order_index,ph.id from public.post_days d join public.post_photos ph on ph.post_day_id=d.id
        where d.post_id=p.id order by d.day_number,d.id,ph.order_index,ph.id limit 4) images),'[]'::jsonb),
    'day_count',(select count(*) from public.post_days d where d.post_id=p.id),
    'mate_count',jsonb_array_length(people.info->'mates'),
    'like_count',likes.total,
    'liked',exists(select 1 from public.post_likes l where l.post_id=p.id and l.user_id=auth.uid())),
    likes.total,p.created_at
  from public.posts p
  cross join lateral (select public.get_post_people(p.id) as info) people
  cross join lateral (select count(*) as total from public.post_likes l where l.post_id=p.id) likes
  where (p_scope='ALL' or (p_scope='ME' and p.user_id=auth.uid()) or (p_scope='MATES' and (p.user_id=auth.uid() or private.are_friends(p.user_id))))
    and (p_query='' or people.info->'author'->>'nickname' ilike v_query
      or exists(select 1 from public.post_days d where d.post_id=p.id and (d.title ilike v_query or d.content ilike v_query))
      or exists(select 1 from public.post_days d join public.post_photos ph on ph.post_day_id=d.id where d.post_id=p.id and (ph.place_name ilike v_query or ph.address ilike v_query)));
end $$;
create or replace function public.list_feed(p_sort text default 'LATEST',p_scope text default 'ALL',p_query text default '',p_limit int default 20,p_offset int default 0)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_result jsonb;
begin
  if p_sort is null or p_sort not in ('LATEST','POPULAR') or p_limit is null or p_limit not between 1 and 50 or p_offset is null or p_offset not between 0 and 500000 then raise exception 'INVALID_REQUEST'; end if;
  with entries as materialized (select * from private.feed_entries(p_scope,p_query)), page as (
    select * from entries order by case when p_sort='POPULAR' then like_count end desc,created_at desc,post_id desc limit p_limit offset p_offset
  ) select jsonb_build_object('items',coalesce((select jsonb_agg(item order by case when p_sort='POPULAR' then like_count end desc,created_at desc,post_id desc) from page),'[]'::jsonb),
    'total',(select count(*) from entries),'limit',p_limit,'offset',p_offset) into v_result;
  return v_result;
end $$;
create or replace function public.feed_neighbors_filtered(p_post_id bigint,p_scope text default 'ALL',p_sort text default 'LATEST',p_query text default '')
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_result jsonb;
begin
  if p_sort is null or p_sort not in ('LATEST','POPULAR') then raise exception 'INVALID_REQUEST'; end if;
  with ranked as (
    select post_id,
      lag(post_id) over (order by case when p_sort='POPULAR' then like_count end desc,created_at desc,post_id desc) as previous_id,
      lead(post_id) over (order by case when p_sort='POPULAR' then like_count end desc,created_at desc,post_id desc) as next_id
    from private.feed_entries(p_scope,p_query)
  ) select jsonb_build_object('previousPostId',previous_id,'nextPostId',next_id) into v_result from ranked where post_id=p_post_id;
  return coalesce(v_result,jsonb_build_object('previousPostId',null,'nextPostId',null));
end $$;
revoke all on function public.get_post_people(bigint),private.feed_entries(text,text),public.feed_neighbors_filtered(bigint,text,text,text) from public,anon;
grant execute on function public.get_post_people(bigint),private.feed_entries(text,text),public.feed_neighbors_filtered(bigint,text,text,text) to authenticated;
commit;
