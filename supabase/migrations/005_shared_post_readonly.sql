begin;

-- 공개 일기 한 건만 반환하며 기존 테이블의 RLS와 쓰기 권한은 변경하지 않는다.
create or replace function public.get_shared_post(p_post_id bigint)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'user_id', p.user_id,
    'start_date', p.start_date,
    'end_date', p.end_date,
    'visibility', p.visibility,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'author', (select jsonb_build_object('nickname', u.nickname, 'avatar_url', u.avatar_url)
      from public.users u where u.id = p.user_id),
    'post_members', '[]'::jsonb,
    'post_days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'day_number', d.day_number, 'date', d.date,
        'title', d.title, 'content', d.content,
        'post_photos', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', ph.id, 'image_url', ph.image_url, 'taken_at', ph.taken_at,
            'place_name', ph.place_name, 'address', ph.address,
            'latitude', ph.latitude, 'longitude', ph.longitude,
            'order_index', ph.order_index
          ) order by ph.order_index, ph.id)
          from public.post_photos ph where ph.post_day_id = d.id
        ), '[]'::jsonb)
      ) order by d.day_number, d.id)
      from public.post_days d where d.post_id = p.id
    ), '[]'::jsonb)
  )
  from public.posts p
  where p.id = p_post_id and p.visibility = 'PUBLIC';
$$;

revoke all on function public.get_shared_post(bigint) from public;
grant execute on function public.get_shared_post(bigint) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
