ALTER TABLE public.posts ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE public.post_members DROP CONSTRAINT IF EXISTS post_members_user_id_fkey;

DROP POLICY IF EXISTS "게시글 읽기 권한" ON public.posts;
DROP POLICY IF EXISTS "게시글 작성 권한" ON public.posts;
DROP POLICY IF EXISTS "게시글 수정 권한" ON public.posts;
DROP POLICY IF EXISTS "게시글 삭제 권한" ON public.posts;
DROP POLICY IF EXISTS "게시글 전체 접근" ON public.posts;
CREATE POLICY "게시글 전체 접근" ON public.posts
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts, public.post_members, public.post_days, public.post_photos TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;


DROP POLICY IF EXISTS "test users can upload post images" ON storage.objects;
CREATE POLICY "test users can upload post images" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'post-images');


DO $$ BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS on_trip_lounge_user_created ON auth.users';
  END IF;
  IF to_regclass('public.users') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS users_updated_at ON public.users';
  END IF;
  IF to_regprocedure('private.create_profile()') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION private.create_profile()';
  END IF;
  IF to_regprocedure('private.touch_updated_at()') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION private.touch_updated_at()';
  END IF;
  IF to_regprocedure('private.generate_friend_code()') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION private.generate_friend_code()';
  END IF;
END $$;
DROP TABLE IF EXISTS public.post_likes CASCADE;
DROP TABLE IF EXISTS public.friend_codes CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
