-- Supabase SQL Editor에서 실행
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         varchar(100) not null unique,
  password_hash text         not null,
  nickname      varchar(20)  not null unique,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);
