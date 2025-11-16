## SQL for Supabase
```bash
-- =====================================================
-- COLLEGE SHOWCASE DATABASE SETUP (Complete & Updated)
-- =====================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    nickname TEXT,
    age INTEGER,
    gender TEXT,
    department TEXT,
    class TEXT,
    section TEXT,
    hobby TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    image_urls TEXT[],
    video_url TEXT,
    file_url TEXT,
    file_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES TABLE POLICIES (idempotent)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Public profiles are viewable by everyone'
      AND c.relname = 'profiles'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "Public profiles are viewable by everyone"
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING ( true );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Users can insert their own profile'
      AND c.relname = 'profiles'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK ( (auth.uid() = id) );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Users can update their own profile'
      AND c.relname = 'profiles'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING ( (auth.uid() = id) )
      WITH CHECK ( (auth.uid() = id) );
  END IF;
END;
$$;

-- =====================================================
-- POSTS TABLE POLICIES - FIXED FOR EDIT/DELETE
-- =====================================================

-- First drop old policies if they exist
DO $$
BEGIN
  -- Drop old SELECT policy
  IF EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Posts are viewable by all authenticated users'
      AND c.relname = 'posts'
      AND n.nspname = 'public'
  ) THEN
    DROP POLICY "Posts are viewable by all authenticated users" ON public.posts;
  END IF;

  -- Drop old INSERT policy
  IF EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Users can insert their own posts'
      AND c.relname = 'posts'
      AND n.nspname = 'public'
  ) THEN
    DROP POLICY "Users can insert their own posts" ON public.posts;
  END IF;

  -- Drop old UPDATE policy
  IF EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Users can update their own posts'
      AND c.relname = 'posts'
      AND n.nspname = 'public'
  ) THEN
    DROP POLICY "Users can update their own posts" ON public.posts;
  END IF;

  -- Drop old DELETE policy
  IF EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Users can delete their own posts'
      AND c.relname = 'posts'
      AND n.nspname = 'public'
  ) THEN
    DROP POLICY "Users can delete their own posts" ON public.posts;
  END IF;
END;
$$;

-- Create new fixed policies
DO $$
BEGIN
  -- SELECT: View all posts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Posts are viewable by all authenticated users'
      AND c.relname = 'posts'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "Posts are viewable by all authenticated users"
      ON public.posts
      FOR SELECT
      TO authenticated
      USING ( true );
  END IF;
END;
$$;

DO $$
BEGIN
  -- INSERT: Create own posts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Users can insert their own posts'
      AND c.relname = 'posts'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "Users can insert their own posts"
      ON public.posts
      FOR INSERT
      TO authenticated
      WITH CHECK ( auth.uid() = user_id );
  END IF;
END;
$$;

DO $$
BEGIN
  -- UPDATE: Edit only own posts (FIXED)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Users can update their own posts'
      AND c.relname = 'posts'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "Users can update their own posts"
      ON public.posts
      FOR UPDATE
      TO authenticated
      USING ( auth.uid() = user_id )
      WITH CHECK ( auth.uid() = user_id );
  END IF;
END;
$$;

DO $$
BEGIN
  -- DELETE: Delete only own posts (FIXED)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Users can delete their own posts'
      AND c.relname = 'posts'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "Users can delete their own posts"
      ON public.posts
      FOR DELETE
      TO authenticated
      USING ( auth.uid() = user_id );
  END IF;
END;
$$;

-- =====================================================
-- STORAGE SETUP
-- =====================================================

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'media',
    'media',
    true,
    52428800,
    ARRAY[
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ]
)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public, 
  file_size_limit = EXCLUDED.file_size_limit, 
  allowed_mime_types = EXCLUDED.allowed_mime_types, 
  name = EXCLUDED.name;

-- Drop existing storage policies if they exist (clean slate)
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Create simplified storage policies
CREATE POLICY "Allow all authenticated uploads"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'media' );

CREATE POLICY "Allow public reads"
  ON storage.objects
  FOR SELECT
  TO public
  USING ( bucket_id = 'media' );

CREATE POLICY "Allow authenticated updates"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING ( bucket_id = 'media' )
  WITH CHECK ( bucket_id = 'media' );

CREATE POLICY "Allow authenticated deletes"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING ( bucket_id = 'media' );

-- =====================================================
-- INDEXES FOR PERFORMANCE (safe to run repeatedly)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- =====================================================
-- FUNCTIONS AND TRIGGERS (idempotent)
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'update_profiles_updated_at' AND c.relname = 'profiles' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

-- Trigger for posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'update_posts_updated_at' AND c.relname = 'posts' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER update_posts_updated_at
      BEFORE UPDATE ON public.posts
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

-- =====================================================
-- OPTIONAL: USER LIMIT TRACKING (idempotent)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    max_users INTEGER DEFAULT 5,
    current_users INTEGER DEFAULT 0,
    CHECK (id = 1)
);

INSERT INTO public.app_settings (id, max_users, current_users)
VALUES (1, 5, 0)
ON CONFLICT (id) DO NOTHING;

-- Function to check user limit before signup
CREATE OR REPLACE FUNCTION public.check_user_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    max_count INTEGER;
BEGIN
    SELECT current_users, max_users INTO current_count, max_count
    FROM public.app_settings WHERE id = 1;
    
    IF current_count >= max_count THEN
        RAISE EXCEPTION 'User limit reached. Maximum % users allowed.', max_count;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check user limit on profile creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'check_user_limit_trigger' AND c.relname = 'profiles' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER check_user_limit_trigger
      BEFORE INSERT ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.check_user_limit();
  END IF;
END;
$$;

-- Function to increment user count
CREATE OR REPLACE FUNCTION public.increment_user_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.app_settings SET current_users = current_users + 1 WHERE id = 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment count after profile creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'increment_user_count_trigger' AND c.relname = 'profiles' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER increment_user_count_trigger
      AFTER INSERT ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.increment_user_count();
  END IF;
END;
$$;

-- Function to decrement user count
CREATE OR REPLACE FUNCTION public.decrement_user_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.app_settings SET current_users = current_users - 1 WHERE id = 1;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to decrement count after profile deletion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'decrement_user_count_trigger' AND c.relname = 'profiles' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER decrement_user_count_trigger
      AFTER DELETE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.decrement_user_count();
  END IF;
END;
$$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'posts', 'app_settings');

-- Check RLS policies in public schema
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- Check storage policies in storage schema (objects)
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Check storage bucket
SELECT id, name, public FROM storage.buckets WHERE id = 'media';

-- Check current user count
SELECT * FROM public.app_settings;
```