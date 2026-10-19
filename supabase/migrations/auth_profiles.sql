-- Fresh auth-only database baseline. Do not apply over the team 001-006 migrations.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname varchar(30) not null check (char_length(trim(nickname)) between 2 and 30),
  avatar_url text check (avatar_url is null or (length(avatar_url) <= 2048 and avatar_url like 'https://%')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.friend_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  friend_code varchar(7) not null unique check (friend_code ~ '^[A-Z0-9]{7}$'),
  created_at timestamptz not null default now()
);
create function private.generate_friend_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  v_alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_code text := '';
  v_byte int;
begin
  while length(v_code) < 7 loop
    -- The first UUID byte has no version/variant bits. Reject 252-255 to avoid modulo bias.
    v_byte := get_byte(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 0);
    if v_byte < 252 then
      v_code := v_code || substr(v_alphabet, (v_byte % 36) + 1, 1);
    end if;
  end loop;
  return v_code;
end $$;
revoke all on function private.generate_friend_code() from public, anon, authenticated;

create function private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_attempt int;
begin
  insert into public.users(id,nickname) values(new.id, '여행자_' || left(replace(new.id::text,'-',''),12));
  for v_attempt in 1..100 loop
    insert into public.friend_codes(user_id,friend_code)
    values(new.id,private.generate_friend_code())
    on conflict(friend_code) do nothing;
    if found then return new; end if;
  end loop;
  raise exception 'FRIEND_CODE_GENERATION_FAILED';
end $$;

create trigger on_trip_lounge_user_created after insert on auth.users
for each row execute function private.create_profile();
-- Existing accounts are backfilled without touching auth.users.
insert into public.users(id,nickname)
select id,'여행자_' || left(replace(id::text,'-',''),12) from auth.users;
do $$ declare v_user record; v_attempt int; v_inserted boolean; begin
  for v_user in select id from public.users loop
    v_inserted := false;
    for v_attempt in 1..100 loop
      insert into public.friend_codes(user_id,friend_code)
      values(v_user.id,private.generate_friend_code()) on conflict(friend_code) do nothing;
      if found then v_inserted := true; exit; end if;
    end loop;
    if not v_inserted then raise exception 'FRIEND_CODE_GENERATION_FAILED'; end if;
  end loop;
end $$;
create function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger users_updated_at before update on public.users for each row execute function private.touch_updated_at();
alter table public.users enable row level security;
alter table public.friend_codes enable row level security;
revoke all on public.users, public.friend_codes from anon, authenticated;
grant select on public.users, public.friend_codes to authenticated;
grant update(nickname,avatar_url) on public.users to authenticated;
create policy users_self_read on public.users for select to authenticated using(id = (select auth.uid()));
create policy users_self_update on public.users for update to authenticated using(id = (select auth.uid())) with check(id = (select auth.uid()));
create policy codes_self_read on public.friend_codes for select to authenticated using(user_id = (select auth.uid()));
revoke all on function private.create_profile(), private.touch_updated_at() from public;
commit;
