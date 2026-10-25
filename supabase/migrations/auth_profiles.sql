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
  friend_code varchar(16) not null unique check (friend_code ~ '^[A-F0-9]{16}$'),
  created_at timestamptz not null default now()
);
create function private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_attempt int := 0;
begin
  insert into public.users(id,nickname) values (new.id, '여행자_' || left(replace(new.id::text,'-',''),12));
  loop
    begin
      insert into public.friend_codes(user_id,friend_code)
      values(new.id,upper(substr(replace(gen_random_uuid()::text,'-',''),1,8) || substr(replace(gen_random_uuid()::text,'-',''),1,8)));
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt > 10 then raise; end if;
    end;
  end loop;
  return new;
end $$;
create trigger on_trip_lounge_user_created after insert on auth.users
for each row execute function private.create_profile();
-- auth.users를 변경하지 않고 기존 계정의 프로필·친구 코드를 생성하는 처리임.
insert into public.users(id,nickname)
select id,'여행자_' || left(replace(id::text,'-',''),12) from auth.users;
do $$ declare v_user record; begin
  for v_user in select id from public.users loop
    loop
      begin
        insert into public.friend_codes(user_id,friend_code)
        values(v_user.id,upper(substr(replace(gen_random_uuid()::text,'-',''),1,8) || substr(replace(gen_random_uuid()::text,'-',''),1,8)));
        exit;
      exception when unique_violation then null;
      end;
    end loop;
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
