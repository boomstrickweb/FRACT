/*
  # Create posts and related tables

  1. New Tables
    - `posts`
      - `id` (uuid, primary key)
      - `author_id` (uuid, references profiles.id)
      - `content` (text)
      - `post_type` (enum: text, quote, voice)
      - `quote_signature` (text, for quote posts)
      - `voice_url` (text, for voice posts)
      - `is_explicit` (boolean)
      - `is_anonymous` (boolean)
      - `disappears_at` (timestamp, nullable)
      - `view_count` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `reposts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id)
      - `post_id` (uuid, references posts.id)
      - `is_reply_post` (boolean, default false)
      - `reply_content` (text, nullable)
      - `created_at` (timestamp)
    - `saved_posts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id)
      - `post_id` (uuid, references posts.id)
      - `created_at` (timestamp)
    - `post_views`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id)
      - `post_id` (uuid, references posts.id)
      - `viewed_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for CRUD operations
    - Add policies for anonymous posts
*/

-- Create enum for post types
CREATE TYPE post_type AS ENUM ('text', 'quote', 'voice');

-- Create posts table
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

-- Create reposts table
CREATE TABLE IF NOT EXISTS reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  is_reply_post boolean DEFAULT false,
  reply_content text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Create saved posts table
CREATE TABLE IF NOT EXISTS saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Create post views table
CREATE TABLE IF NOT EXISTS post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Posts are viewable by everyone"
  ON posts
  FOR SELECT
  TO authenticated, anon
  USING (
    -- Show post if not disappeared or if user is the author
    (disappears_at IS NULL OR disappears_at > now()) OR 
    (auth.uid() = author_id)
  );

CREATE POLICY "Users can create posts"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts"
  ON posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own posts"
  ON posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Reposts policies
CREATE POLICY "Reposts are viewable by everyone"
  ON reposts
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create reposts"
  ON reposts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reposts"
  ON reposts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Saved posts policies
CREATE POLICY "Users can view own saved posts"
  ON saved_posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts"
  ON saved_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts"
  ON saved_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Post views policies
CREATE POLICY "Users can view post views"
  ON post_views
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can record post views"
  ON post_views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS posts_author_id_idx ON posts(author_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_disappears_at_idx ON posts(disappears_at);
CREATE INDEX IF NOT EXISTS reposts_user_id_idx ON reposts(user_id);
CREATE INDEX IF NOT EXISTS reposts_post_id_idx ON reposts(post_id);
CREATE INDEX IF NOT EXISTS saved_posts_user_id_idx ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS post_views_post_id_idx ON post_views(post_id);

-- Create trigger for posts updated_at
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for voice notes
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for voice notes
CREATE POLICY "Users can upload voice notes"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Voice notes are publicly viewable"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'voice-notes');

CREATE POLICY "Users can update their own voice notes"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own voice notes"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to automatically delete expired posts
CREATE OR REPLACE FUNCTION delete_expired_posts()
RETURNS void AS $$
BEGIN
  DELETE FROM posts 
  WHERE disappears_at IS NOT NULL 
  AND disappears_at <= now();
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_post_view(post_uuid uuid, user_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Insert view record if not exists
  INSERT INTO post_views (user_id, post_id)
  VALUES (user_uuid, post_uuid)
  ON CONFLICT (user_id, post_id) DO NOTHING;
  
  -- Update view count
  UPDATE posts 
  SET view_count = (
    SELECT COUNT(*) FROM post_views WHERE post_id = post_uuid
  )
  WHERE id = post_uuid;
END;
$$ LANGUAGE plpgsql;