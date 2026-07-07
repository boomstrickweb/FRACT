/*
  # Complete Supabase Recovery Migration

  1. Tables
    - Recreate all tables with proper structure
    - Add missing columns including reply_to_post_id
    - Ensure all foreign key relationships exist

  2. Security
    - Enable RLS on all tables
    - Recreate all policies

  3. Functions & Triggers
    - Recreate all custom functions
    - Recreate all triggers

  4. Views
    - Recreate feed_posts view with proper relationships

  5. Storage
    - Ensure storage buckets exist
    - Recreate storage policies
*/

-- Ensure post_type enum exists
DO $$ BEGIN
    CREATE TYPE post_type AS ENUM ('text', 'quote', 'voice');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure all tables exist with proper structure
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text UNIQUE NOT NULL,
  country_code text NOT NULL,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  username text UNIQUE,
  name text,
  bio text,
  profile_pic_url text,
  profile_completed boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  post_type post_type NOT NULL DEFAULT 'text',
  quote_signature text,
  voice_url text,
  is_explicit boolean DEFAULT false,
  is_anonymous boolean DEFAULT false,
  disappears_at timestamptz,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add reply_to_post_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'reply_to_post_id'
  ) THEN
    ALTER TABLE posts ADD COLUMN reply_to_post_id uuid REFERENCES posts(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  is_reply_post boolean DEFAULT false,
  reply_content text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS post_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  content text NOT NULL,
  quote_signature text,
  edited_at timestamptz DEFAULT now(),
  version_number integer NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_edit_history ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);
CREATE INDEX IF NOT EXISTS posts_author_id_idx ON posts(author_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_disappears_at_idx ON posts(disappears_at);
CREATE INDEX IF NOT EXISTS posts_reply_to_post_id_idx ON posts(reply_to_post_id);
CREATE INDEX IF NOT EXISTS reposts_user_id_idx ON reposts(user_id);
CREATE INDEX IF NOT EXISTS reposts_post_id_idx ON reposts(post_id);
CREATE INDEX IF NOT EXISTS saved_posts_user_id_idx ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS post_views_post_id_idx ON post_views(post_id);
CREATE INDEX IF NOT EXISTS post_edit_history_post_id_idx ON post_edit_history(post_id);
CREATE INDEX IF NOT EXISTS post_edit_history_version_idx ON post_edit_history(post_id, version_number);

-- Recreate functions first (needed for triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION create_post_edit_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content OR 
     OLD.quote_signature IS DISTINCT FROM NEW.quote_signature THEN
    
    INSERT INTO post_edit_history (
      post_id,
      content,
      quote_signature,
      edited_at,
      version_number
    )
    VALUES (
      OLD.id,
      OLD.content,
      OLD.quote_signature,
      OLD.updated_at,
      COALESCE(
        (SELECT MAX(version_number) FROM post_edit_history WHERE post_id = OLD.id),
        0
      ) + 1
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_expired_posts()
RETURNS void AS $$
BEGIN
  DELETE FROM posts 
  WHERE disappears_at IS NOT NULL 
  AND disappears_at <= now();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_post_view(post_uuid uuid, user_uuid uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO post_views (user_id, post_id)
  VALUES (user_uuid, post_uuid)
  ON CONFLICT (user_id, post_id) DO NOTHING;
  
  UPDATE posts 
  SET view_count = (
    SELECT COUNT(*) FROM post_views WHERE post_id = post_uuid
  )
  WHERE id = post_uuid AND (reply_to_post_id IS NULL OR reply_to_post_id IS NOT NULL);
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS create_post_edit_history_trigger ON posts;
CREATE TRIGGER create_post_edit_history_trigger
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION create_post_edit_history();

-- Now create the feed_posts view (after reply_to_post_id column exists)
DROP VIEW IF EXISTS feed_posts;
CREATE VIEW feed_posts AS
-- Original posts
SELECT 
  p.id,
  p.author_id,
  p.content,
  p.post_type,
  p.quote_signature,
  p.voice_url,
  p.is_explicit,
  p.is_anonymous,
  p.disappears_at,
  p.view_count,
  p.created_at,
  p.updated_at,
  p.reply_to_post_id,
  'post' as feed_type,
  p.created_at as feed_created_at,
  NULL::uuid as repost_user_id,
  NULL::text as repost_username,
  NULL::text as repost_name,
  NULL::timestamptz as repost_created_at
FROM posts p
WHERE p.reply_to_post_id IS NULL

UNION ALL

-- Reposts
SELECT 
  p.id,
  p.author_id,
  p.content,
  p.post_type,
  p.quote_signature,
  p.voice_url,
  p.is_explicit,
  p.is_anonymous,
  p.disappears_at,
  p.view_count,
  p.created_at,
  p.updated_at,
  p.reply_to_post_id,
  'repost' as feed_type,
  r.created_at as feed_created_at,
  r.user_id as repost_user_id,
  pr.username as repost_username,
  pr.name as repost_name,
  r.created_at as repost_created_at
FROM posts p
JOIN reposts r ON p.id = r.post_id
JOIN profiles pr ON r.user_id = pr.id
WHERE r.is_reply_post = false AND p.reply_to_post_id IS NULL

UNION ALL

-- Reply posts
SELECT 
  p.id,
  p.author_id,
  p.content,
  p.post_type,
  p.quote_signature,
  p.voice_url,
  p.is_explicit,
  p.is_anonymous,
  p.disappears_at,
  p.view_count,
  p.created_at,
  p.updated_at,
  p.reply_to_post_id,
  'reply' as feed_type,
  p.created_at as feed_created_at,
  NULL::uuid as repost_user_id,
  NULL::text as repost_username,
  NULL::text as repost_name,
  NULL::timestamptz as repost_created_at
FROM posts p
WHERE p.reply_to_post_id IS NOT NULL;

-- Recreate RLS policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can read own phone verifications" ON phone_verifications;
CREATE POLICY "Users can read own phone verifications"
  ON phone_verifications FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert phone verifications" ON phone_verifications;
CREATE POLICY "Users can insert phone verifications"
  ON phone_verifications FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update phone verifications" ON phone_verifications;
CREATE POLICY "Users can update phone verifications"
  ON phone_verifications FOR UPDATE TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT TO authenticated, anon
  USING (
    (disappears_at IS NULL OR disappears_at > now()) OR 
    (auth.uid() = author_id)
  );

DROP POLICY IF EXISTS "Users can create posts" ON posts;
CREATE POLICY "Users can create posts"
  ON posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE TO authenticated
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Reposts are viewable by everyone" ON reposts;
CREATE POLICY "Reposts are viewable by everyone"
  ON reposts FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Users can create reposts" ON reposts;
CREATE POLICY "Users can create reposts"
  ON reposts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reposts" ON reposts;
CREATE POLICY "Users can delete own reposts"
  ON reposts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own saved posts" ON saved_posts;
CREATE POLICY "Users can view own saved posts"
  ON saved_posts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save posts" ON saved_posts;
CREATE POLICY "Users can save posts"
  ON saved_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave posts" ON saved_posts;
CREATE POLICY "Users can unsave posts"
  ON saved_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view post views" ON post_views;
CREATE POLICY "Users can view post views"
  ON post_views FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can record post views" ON post_views;
CREATE POLICY "Users can record post views"
  ON post_views FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view edit history of posts they can see" ON post_edit_history;
CREATE POLICY "Users can view edit history of posts they can see"
  ON post_edit_history FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_edit_history.post_id 
      AND (
        (posts.disappears_at IS NULL OR posts.disappears_at > now()) OR 
        (auth.uid() = posts.author_id)
      )
    )
  );

-- Ensure storage buckets exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', true)
ON CONFLICT (id) DO NOTHING;

-- Recreate storage policies
DROP POLICY IF EXISTS "Users can upload their own profile pictures" ON storage.objects;
CREATE POLICY "Users can upload their own profile pictures"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Profile pictures are publicly viewable" ON storage.objects;
CREATE POLICY "Profile pictures are publicly viewable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'profile-pictures');

DROP POLICY IF EXISTS "Users can update their own profile pictures" ON storage.objects;
CREATE POLICY "Users can update their own profile pictures"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;
CREATE POLICY "Users can delete their own profile pictures"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload voice notes" ON storage.objects;
CREATE POLICY "Users can upload voice notes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Voice notes are publicly viewable" ON storage.objects;
CREATE POLICY "Voice notes are publicly viewable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'voice-notes');

DROP POLICY IF EXISTS "Users can update their own voice notes" ON storage.objects;
CREATE POLICY "Users can update their own voice notes"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own voice notes" ON storage.objects;
CREATE POLICY "Users can delete their own voice notes"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);