begin;
alter table public.users add column if not exists bio varchar(60) not null default '';
grant select(bio), update(bio) on public.users to authenticated;
notify pgrst, 'reload schema';
commit;
