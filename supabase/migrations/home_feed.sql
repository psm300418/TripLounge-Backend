begin;
create function private.can_view_post(p_post_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.posts p where p.id=p_post_id and (
    p.user_id=auth.uid() or p.visibility='PUBLIC' or
    (p.visibility='FRIENDS' and private.are_friends(p.user_id)) or
    (p.visibility='MEMBERS_ONLY' and exists(select 1 from public.post_members m where m.post_id=p.id and m.user_id=auth.uid()))
  ));
$$;
create function private.owns_post(p_post_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.posts where id=p_post_id and user_id=auth.uid());
$$;
create function private.can_view_day(p_day_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.post_days where id=p_day_id and private.can_view_post(post_id));
$$;
create function private.owns_day(p_day_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.post_days where id=p_day_id and private.owns_post(post_id));
$$;
-- Restrictive policies also constrain any older permissive policies.
do $$ declare v_table text; v_read text; v_write text; begin
  foreach v_table in array array['posts','post_members','post_days','post_photos'] loop
    v_read := case v_table when 'posts' then 'private.can_view_post(id)' when 'post_photos' then 'private.can_view_day(post_day_id)' else 'private.can_view_post(post_id)' end;
    v_write := case v_table when 'posts' then 'user_id = (select auth.uid())' when 'post_photos' then 'private.owns_day(post_day_id)' else 'private.owns_post(post_id)' end;
    execute format('alter table public.%I enable row level security',v_table);
    execute format('revoke all on public.%I from anon, authenticated',v_table);
    execute format('grant select, insert, update, delete on public.%I to authenticated',v_table);
    execute format('create policy tl_read_allow on public.%I for select to authenticated using (%s)',v_table,v_read);
    execute format('create policy tl_read_guard on public.%I as restrictive for select to authenticated using (%s)',v_table,v_read);
    execute format('create policy tl_insert_allow on public.%I for insert to authenticated with check (%s)',v_table,v_write);
    execute format('create policy tl_insert_guard on public.%I as restrictive for insert to authenticated with check (%s)',v_table,v_write);
    execute format('create policy tl_update_allow on public.%I for update to authenticated using (%s) with check (%s)',v_table,v_write,v_write);
    execute format('create policy tl_update_guard on public.%I as restrictive for update to authenticated using (%s) with check (%s)',v_table,v_write,v_write);
    execute format('create policy tl_delete_allow on public.%I for delete to authenticated using (%s)',v_table,v_write);
    execute format('create policy tl_delete_guard on public.%I as restrictive for delete to authenticated using (%s)',v_table,v_write);
  end loop;
end $$;
grant usage on sequence public.posts_id_seq,public.post_members_id_seq,public.post_days_id_seq,public.post_photos_id_seq to authenticated;
create table public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(), unique(post_id,user_id)
);
alter table public.post_likes enable row level security;
revoke all on public.post_likes from anon,authenticated;
grant select,insert,delete on public.post_likes to authenticated;
create policy likes_read on public.post_likes for select to authenticated using(private.can_view_post(post_id));
create policy likes_insert on public.post_likes for insert to authenticated with check(user_id=(select auth.uid()) and private.can_view_post(post_id));
create policy likes_delete on public.post_likes for delete to authenticated using(user_id=(select auth.uid()));
create function private.notify_post_like() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.posts where id=new.post_id;
  if v_owner<>new.user_id then
    insert into public.notifications(user_id,actor_id,type,post_id) values(v_owner,new.user_id,'POST_LIKE',new.post_id);
  end if;
  return new;
end $$;
create trigger post_like_notification after insert on public.post_likes for each row execute function private.notify_post_like();
create function public.list_feed(p_sort text default 'LATEST',p_scope text default 'ALL',p_query text default '',p_limit int default 20,p_offset int default 0)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_result jsonb; v_query text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_sort is null or p_sort not in ('LATEST','POPULAR') or p_scope is null or p_scope not in ('ALL','MATES') or
     p_limit is null or p_limit not between 1 and 50 or p_offset is null or p_offset not between 0 and 500000 or
     p_query is null or length(p_query)>100 then raise exception 'INVALID_REQUEST'; end if;
  v_query := '%' || replace(replace(replace(p_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  with visible_posts as (
    select p.*,(select count(*) from public.post_likes l where l.post_id=p.id) as like_count,
      (select d.title from public.post_days d where d.post_id=p.id order by d.day_number,d.id limit 1) as title,
      (select ph.image_url from public.post_days d join public.post_photos ph on ph.post_day_id=d.id
       where d.post_id=p.id order by d.day_number,d.id,ph.order_index,ph.id limit 1) as image_url
    from public.posts p where (p_scope='ALL' or p.user_id=auth.uid() or private.are_friends(p.user_id))
    and (p_query='' or exists(select 1 from public.post_days d where d.post_id=p.id and (d.title ilike v_query or d.content ilike v_query)))
  ), page as (
    select * from visible_posts order by case when p_sort='POPULAR' then like_count end desc,created_at desc,id desc
    limit p_limit offset p_offset
  ) select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),
    'total',(select count(*) from visible_posts),'limit',p_limit,'offset',p_offset) into v_result;
  return v_result;
end $$;
create function public.feed_neighbors(p_post_id bigint,p_scope text default 'ALL') returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_post public.posts; v_previous bigint; v_next bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_scope is null or p_scope not in ('ALL','MATES') then raise exception 'INVALID_REQUEST'; end if;
  select * into v_post from public.posts where id=p_post_id and (p_scope='ALL' or user_id=auth.uid() or private.are_friends(user_id));
  if not found then return jsonb_build_object('previousPostId',null,'nextPostId',null); end if;
  select id into v_previous from public.posts where (created_at,id)>(v_post.created_at,v_post.id)
    and (p_scope='ALL' or user_id=auth.uid() or private.are_friends(user_id)) order by created_at,id limit 1;
  select id into v_next from public.posts where (created_at,id)<(v_post.created_at,v_post.id)
    and (p_scope='ALL' or user_id=auth.uid() or private.are_friends(user_id)) order by created_at desc,id desc limit 1;
  return jsonb_build_object('previousPostId',v_previous,'nextPostId',v_next);
end $$;
revoke all on function private.can_view_post(bigint),private.owns_post(bigint),private.can_view_day(bigint),private.owns_day(bigint),private.notify_post_like(),public.list_feed(text,text,text,int,int),public.feed_neighbors(bigint,text) from public;
grant execute on function private.can_view_post(bigint),private.owns_post(bigint),private.can_view_day(bigint),private.owns_day(bigint),public.list_feed(text,text,text,int,int),public.feed_neighbors(bigint,text) to authenticated;
commit;
