begin;

-- 기존 댓글 테이블과 권한 함수를 먼저 적용해야 하는 설정
do $$ begin
  if to_regclass('public.comments') is null then
    raise exception 'public.comments must be installed before reply migration';
  end if;
  if to_regprocedure('private.comment_can_view_post(bigint)') is null then
    raise exception 'private.comment_can_view_post(bigint) must be installed before reply migration';
  end if;
end $$;

-- 기존 삭제된 대댓글은 완전히 제거
delete from public.comments
where parent_comment_id is not null and deleted_at is not null;

-- 대댓글이 남지 않은 삭제 댓글은 완전히 제거
delete from public.comments c
where c.parent_comment_id is null
  and c.deleted_at is not null
  and not exists (
    select 1 from public.comments r
    where r.parent_comment_id = c.id and r.deleted_at is null
  );

-- 최상위 댓글 목록에 대댓글 수 포함
create or replace function public.list_post_comments(
  p_post_id bigint,
  p_limit int default 20,
  p_offset int default 0
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_post_id is null or p_post_id <= 0 or p_limit is null or p_limit not between 1 and 50
     or p_offset is null or p_offset not between 0 and 500000 then
    raise exception 'INVALID_REQUEST';
  end if;
  if not private.comment_can_view_post(p_post_id) then raise exception 'POST_NOT_FOUND'; end if;

  with visible_comments as (
    select c.id, c.parent_comment_id, c.content, c.created_at, c.updated_at,
      c.deleted_at, c.user_id, u.nickname, u.avatar_url
    from public.comments c
    left join public.users u on u.id = c.user_id and c.deleted_at is null
    where c.post_id = p_post_id and c.parent_comment_id is null
  ), page as (
    select * from visible_comments order by created_at, id limit p_limit offset p_offset
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'parentCommentId', p.parent_comment_id,
        'content', case when p.deleted_at is null then p.content else '삭제된 댓글입니다.' end,
        'createdAt', p.created_at,
        'updatedAt', p.updated_at,
        'deletedAt', p.deleted_at,
        'author', case when p.deleted_at is null then
          jsonb_build_object('nickname', p.nickname, 'avatarUrl', p.avatar_url)
          else null end,
        'isMine', p.user_id = auth.uid(),
        'replyCount', (select count(*) from public.comments r
          where r.parent_comment_id = p.id and r.deleted_at is null)
      ) order by p.created_at, p.id) from page p
    ), '[]'::jsonb),
    'total', (select count(*) from visible_comments),
    'limit', p_limit,
    'offset', p_offset
  ) into v_result;

  return v_result;
end;
$$;

-- 최상위 댓글의 대댓글 목록 조회
create or replace function public.list_comment_replies(
  p_comment_id bigint,
  p_limit int default 20,
  p_offset int default 0
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_parent public.comments; v_result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_comment_id is null or p_comment_id <= 0 or p_limit is null or p_limit not between 1 and 50
     or p_offset is null or p_offset not between 0 and 500000 then
    raise exception 'INVALID_REQUEST';
  end if;

  select * into v_parent from public.comments
  where id = p_comment_id and parent_comment_id is null;
  if not found then raise exception 'COMMENT_NOT_FOUND'; end if;
  if not private.comment_can_view_post(v_parent.post_id) then raise exception 'POST_NOT_FOUND'; end if;

  with visible_replies as (
    select c.id, c.parent_comment_id, c.content, c.created_at, c.updated_at,
      c.deleted_at, c.user_id, u.nickname, u.avatar_url
    from public.comments c
    left join public.users u on u.id = c.user_id and c.deleted_at is null
    where c.parent_comment_id = p_comment_id and c.deleted_at is null
  ), page as (
    select * from visible_replies order by created_at, id limit p_limit offset p_offset
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'parentCommentId', parent_comment_id,
        'content', content,
        'createdAt', created_at,
        'updatedAt', updated_at,
        'deletedAt', deleted_at,
        'author', jsonb_build_object('nickname', nickname, 'avatarUrl', avatar_url),
        'isMine', user_id = auth.uid()
      ) order by created_at, id) from page
    ), '[]'::jsonb),
    'total', (select count(*) from visible_replies),
    'limit', p_limit,
    'offset', p_offset
  ) into v_result;

  return v_result;
end;
$$;

-- 댓글 작성 시 최상위 댓글 또는 최상위 댓글의 대댓글 저장
drop function if exists public.create_post_comment(bigint, uuid, text);
create or replace function public.create_post_comment(
  p_post_id bigint,
  p_user_id uuid,
  p_content text,
  p_parent_comment_id bigint default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_comment public.comments;
  v_parent public.comments;
  v_nickname text;
  v_avatar_url text;
  v_content text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_user_id is distinct from auth.uid() then raise exception 'FORBIDDEN'; end if;
  if p_post_id is null or p_post_id <= 0 or p_content is null then raise exception 'INVALID_REQUEST'; end if;
  v_content := btrim(p_content);
  if char_length(v_content) not between 1 and 2000 then raise exception 'INVALID_REQUEST'; end if;
  if not private.comment_can_view_post(p_post_id) then raise exception 'POST_NOT_FOUND'; end if;

  if p_parent_comment_id is not null then
    select * into v_parent from public.comments where id = p_parent_comment_id for update;
    if not found or v_parent.post_id <> p_post_id or v_parent.parent_comment_id is not null
       or v_parent.deleted_at is not null then
      raise exception 'INVALID_REQUEST';
    end if;
  end if;

  insert into public.comments(post_id, user_id, parent_comment_id, content)
    values (p_post_id, auth.uid(), p_parent_comment_id, v_content)
    returning * into v_comment;
  select nickname, avatar_url into v_nickname, v_avatar_url
    from public.users where id = auth.uid();

  return jsonb_build_object(
    'id', v_comment.id,
    'parentCommentId', v_comment.parent_comment_id,
    'content', v_comment.content,
    'createdAt', v_comment.created_at,
    'updatedAt', v_comment.updated_at,
    'deletedAt', null,
    'author', case when v_nickname is null then null
      else jsonb_build_object('nickname', v_nickname, 'avatarUrl', v_avatar_url) end,
    'isMine', true
  );
end;
$$;

-- 작성자 본인의 댓글만 수정
create or replace function public.update_post_comment(
  p_comment_id bigint,
  p_user_id uuid,
  p_content text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_comment public.comments; v_nickname text; v_avatar_url text; v_content text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_user_id is distinct from auth.uid() then raise exception 'FORBIDDEN'; end if;
  if p_comment_id is null or p_comment_id <= 0 or p_content is null then raise exception 'INVALID_REQUEST'; end if;
  v_content := btrim(p_content);
  if char_length(v_content) not between 1 and 2000 then raise exception 'INVALID_REQUEST'; end if;

  select * into v_comment from public.comments where id = p_comment_id for update;
  if not found then return null; end if;
  if not private.comment_can_view_post(v_comment.post_id) then raise exception 'POST_NOT_FOUND'; end if;
  if v_comment.user_id <> auth.uid() or v_comment.deleted_at is not null then return null; end if;

  update public.comments set content = v_content, updated_at = now()
    where id = p_comment_id returning * into v_comment;
  select nickname, avatar_url into v_nickname, v_avatar_url
    from public.users where id = auth.uid();

  return jsonb_build_object(
    'id', v_comment.id,
    'parentCommentId', v_comment.parent_comment_id,
    'content', v_comment.content,
    'createdAt', v_comment.created_at,
    'updatedAt', v_comment.updated_at,
    'deletedAt', null,
    'author', case when v_nickname is null then null
      else jsonb_build_object('nickname', v_nickname, 'avatarUrl', v_avatar_url) end,
    'isMine', true
  );
end;
$$;

-- 답글이 달린 부모 댓글은 표시만 하고 나머지는 완전히 삭제
drop function if exists public.soft_delete_post_comment(bigint, uuid);
create or replace function public.delete_post_comment(
  p_comment_id bigint,
  p_user_id uuid
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_comment public.comments;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_user_id is distinct from auth.uid() then raise exception 'FORBIDDEN'; end if;
  if p_comment_id is null or p_comment_id <= 0 then raise exception 'INVALID_REQUEST'; end if;

  select * into v_comment from public.comments where id = p_comment_id for update;
  if not found then return false; end if;
  if not private.comment_can_view_post(v_comment.post_id) then raise exception 'POST_NOT_FOUND'; end if;
  if v_comment.user_id <> auth.uid() or v_comment.deleted_at is not null then return false; end if;

  if v_comment.parent_comment_id is null and exists (
    select 1 from public.comments where parent_comment_id = p_comment_id and deleted_at is null
  ) then
    update public.comments set content = '삭제된 댓글입니다.', deleted_at = now(), updated_at = now()
      where id = p_comment_id;
  else
    delete from public.comments where id = p_comment_id;
    if v_comment.parent_comment_id is not null then
      delete from public.comments p
      where p.id = v_comment.parent_comment_id
        and p.deleted_at is not null
        and not exists (
          select 1 from public.comments r
          where r.parent_comment_id = p.id and r.deleted_at is null
        );
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.list_post_comments(bigint, int, int) from public, anon, authenticated;
revoke all on function public.list_comment_replies(bigint, int, int) from public, anon, authenticated;
revoke all on function public.create_post_comment(bigint, uuid, text, bigint) from public, anon, authenticated;
revoke all on function public.update_post_comment(bigint, uuid, text) from public, anon, authenticated;
revoke all on function public.delete_post_comment(bigint, uuid) from public, anon, authenticated;
grant execute on function public.list_post_comments(bigint, int, int) to authenticated;
grant execute on function public.list_comment_replies(bigint, int, int) to authenticated;
grant execute on function public.create_post_comment(bigint, uuid, text, bigint) to authenticated;
grant execute on function public.update_post_comment(bigint, uuid, text) to authenticated;
grant execute on function public.delete_post_comment(bigint, uuid) to authenticated;

-- Supabase API가 변경된 RPC 목록을 다시 읽도록 알림
notify pgrst, 'reload schema';

commit;
