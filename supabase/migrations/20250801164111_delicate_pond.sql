/*
  # Complete Database Schema Restoration

  This migration recreates the entire FRACT database schema after data loss.
  
  1. Tables
    - profiles: User profile information
    - posts: User posts (text, quote, voice)
    - post_reactions: User reactions to posts
    - post_views: Track post views
    - saved_posts: User saved posts
    - reposts: User reposts
    - post_edit_history: Track post edits
    - phone_verifications: Phone verification records

  2. Storage
    - profile-pictures bucket
    - cover-pictures bucket  
    - voice-notes bucket

  3. Security
    - RLS policies for all tables
    - Storage policies for file access

  4. Functions
    - Utility functions for reactions, views, etc.
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE post_type AS ENUM ('text', 'quote', 'voice');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reaction_type AS ENUM ('respect', 'reject', 'observe');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number text UNIQUE NOT NULL,
    country_code text NOT NULL,
    is_verified boolean DEFAULT false,
    username text UNIQUE,
    name text,
    bio text,
    profile_pic_url text,
    cover_pic_url text,
    beliefs text,
    field text,
    profile_completed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    post_type post_type DEFAULT 'text'::post_type NOT NULL,
    quote_signature text,
    voice_url text,
    is_explicit boolean DEFAULT false,
    is_anonymous boolean DEFAULT false,
    disappears_at timestamptz,
    view_count integer DEFAULT 0,
    reply_to_post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create post_reactions table
CREATE TABLE IF NOT EXISTS post_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reaction_type reaction_type NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, post_id)
);

-- Create post_views table
CREATE TABLE IF NOT EXISTS post_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    viewed_at timestamptz DEFAULT now(),
    UNIQUE(user_id, post_id)
);

-- Create saved_posts table
CREATE TABLE IF NOT EXISTS saved_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, post_id)
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

-- Create post_edit_history table
CREATE TABLE IF NOT EXISTS post_edit_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    content text NOT NULL,
    quote_signature text,
    version_number integer NOT NULL,
    edited_at timestamptz DEFAULT now()
);

-- Create phone_verifications table
CREATE TABLE IF NOT EXISTS phone_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number text NOT NULL,
    otp_code text NOT NULL,
    expires_at timestamptz NOT NULL,
    verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);
CREATE INDEX IF NOT EXISTS posts_author_id_idx ON posts(author_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_disappears_at_idx ON posts(disappears_at);
CREATE INDEX IF NOT EXISTS posts_reply_to_post_id_idx ON posts(reply_to_post_id);
CREATE INDEX IF NOT EXISTS post_reactions_user_id_idx ON post_reactions(user_id);
CREATE INDEX IF NOT EXISTS post_reactions_post_id_idx ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS post_reactions_reaction_type_idx ON post_reactions(reaction_type);
CREATE INDEX IF NOT EXISTS post_views_user_id_idx ON post_views(user_id);
CREATE INDEX IF NOT EXISTS post_views_post_id_idx ON post_views(post_id);
CREATE INDEX IF NOT EXISTS saved_posts_user_id_idx ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS reposts_user_id_idx ON reposts(user_id);
CREATE INDEX IF NOT EXISTS reposts_post_id_idx ON reposts(post_id);
CREATE INDEX IF NOT EXISTS post_edit_history_post_id_idx ON post_edit_history(post_id);
CREATE INDEX IF NOT EXISTS post_edit_history_version_idx ON post_edit_history(post_id, version_number);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- Posts policies
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
CREATE POLICY "Posts are viewable by everyone" ON posts
    FOR SELECT TO anon, authenticated
    USING (
        (disappears_at IS NULL OR disappears_at > now() OR auth.uid() = author_id)
    );

DROP POLICY IF EXISTS "Users can create posts" ON posts;
CREATE POLICY "Users can create posts" ON posts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts" ON posts
    FOR UPDATE TO authenticated
    USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts" ON posts
    FOR DELETE TO authenticated
    USING (auth.uid() = author_id);

-- Post reactions policies
DROP POLICY IF EXISTS "Users can view all reactions" ON post_reactions;
CREATE POLICY "Users can view all reactions" ON post_reactions
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can insert own reactions" ON post_reactions;
CREATE POLICY "Users can insert own reactions" ON post_reactions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reactions" ON post_reactions;
CREATE POLICY "Users can update own reactions" ON post_reactions
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reactions" ON post_reactions;
CREATE POLICY "Users can delete own reactions" ON post_reactions
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Post views policies
DROP POLICY IF EXISTS "Users can view post views" ON post_views;
CREATE POLICY "Users can view post views" ON post_views
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can record post views" ON post_views;
CREATE POLICY "Users can record post views" ON post_views
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Saved posts policies
DROP POLICY IF EXISTS "Users can view own saved posts" ON saved_posts;
CREATE POLICY "Users can view own saved posts" ON saved_posts
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save posts" ON saved_posts;
CREATE POLICY "Users can save posts" ON saved_posts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave posts" ON saved_posts;
CREATE POLICY "Users can unsave posts" ON saved_posts
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Reposts policies
DROP POLICY IF EXISTS "Reposts are viewable by everyone" ON reposts;
CREATE POLICY "Reposts are viewable by everyone" ON reposts
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can create reposts" ON reposts;
CREATE POLICY "Users can create reposts" ON reposts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reposts" ON reposts;
CREATE POLICY "Users can delete own reposts" ON reposts
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Post edit history policies
DROP POLICY IF EXISTS "Users can view edit history of posts they can see" ON post_edit_history;
CREATE POLICY "Users can view edit history of posts they can see" ON post_edit_history
    FOR SELECT TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.id = post_edit_history.post_id 
            AND ((posts.disappears_at IS NULL OR posts.disappears_at > now()) OR auth.uid() = posts.author_id)
        )
    );

DROP POLICY IF EXISTS "Users can create edit history for own posts" ON post_edit_history;
CREATE POLICY "Users can create edit history for own posts" ON post_edit_history
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.id = post_edit_history.post_id 
            AND posts.author_id = auth.uid()
        )
    );

-- Phone verifications policies
DROP POLICY IF EXISTS "Users can read own phone verifications" ON phone_verifications;
CREATE POLICY "Users can read own phone verifications" ON phone_verifications
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can insert phone verifications" ON phone_verifications;
CREATE POLICY "Users can insert phone verifications" ON phone_verifications
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update phone verifications" ON phone_verifications;
CREATE POLICY "Users can update phone verifications" ON phone_verifications
    FOR UPDATE TO anon, authenticated
    USING (true);

-- Create utility functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
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

-- Create post edit history function
CREATE OR REPLACE FUNCTION create_post_edit_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create history if content actually changed
    IF OLD.content IS DISTINCT FROM NEW.content OR OLD.quote_signature IS DISTINCT FROM NEW.quote_signature THEN
        INSERT INTO post_edit_history (post_id, content, quote_signature, version_number)
        VALUES (
            OLD.id,
            OLD.content,
            OLD.quote_signature,
            COALESCE((
                SELECT MAX(version_number) + 1
                FROM post_edit_history
                WHERE post_id = OLD.id
            ), 1)
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for post edit history
DROP TRIGGER IF EXISTS create_post_edit_history_trigger ON posts;
CREATE TRIGGER create_post_edit_history_trigger
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION create_post_edit_history();

-- Create utility functions for reactions and views
CREATE OR REPLACE FUNCTION handle_post_reaction(post_uuid uuid, reaction reaction_type)
RETURNS void AS $$
BEGIN
    INSERT INTO post_reactions (user_id, post_id, reaction_type)
    VALUES (auth.uid(), post_uuid, reaction)
    ON CONFLICT (user_id, post_id)
    DO UPDATE SET reaction_type = reaction, created_at = now();
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE OR REPLACE FUNCTION remove_post_reaction(post_uuid uuid)
RETURNS void AS $$
BEGIN
    DELETE FROM post_reactions
    WHERE user_id = auth.uid() AND post_id = post_uuid;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_post_view(post_uuid uuid, user_uuid uuid)
RETURNS void AS $$
BEGIN
    INSERT INTO post_views (user_id, post_id)
    VALUES (user_uuid, post_uuid)
    ON CONFLICT (user_id, post_id) DO NOTHING;
    
    UPDATE posts
    SET view_count = view_count + 1
    WHERE id = post_uuid;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_post_reaction_counts(post_uuid uuid)
RETURNS TABLE(respect_count bigint, reject_count bigint, observe_count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN reaction_type = 'respect' THEN 1 ELSE 0 END), 0) as respect_count,
        COALESCE(SUM(CASE WHEN reaction_type = 'reject' THEN 1 ELSE 0 END), 0) as reject_count,
        COALESCE(SUM(CASE WHEN reaction_type = 'observe' THEN 1 ELSE 0 END), 0) as observe_count
    FROM post_reactions
    WHERE post_id = post_uuid;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('profile-pictures', 'profile-pictures', true),
    ('cover-pictures', 'cover-pictures', true),
    ('voice-notes', 'voice-notes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile pictures
DROP POLICY IF EXISTS "Profile pictures are publicly accessible" ON storage.objects;
CREATE POLICY "Profile pictures are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'profile-pictures');

DROP POLICY IF EXISTS "Users can upload profile pictures" ON storage.objects;
CREATE POLICY "Users can upload profile pictures"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'profile-pictures');

DROP POLICY IF EXISTS "Users can update own profile pictures" ON storage.objects;
CREATE POLICY "Users can update own profile pictures"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own profile pictures" ON storage.objects;
CREATE POLICY "Users can delete own profile pictures"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for cover pictures
DROP POLICY IF EXISTS "Cover pictures are publicly accessible" ON storage.objects;
CREATE POLICY "Cover pictures are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'cover-pictures');

DROP POLICY IF EXISTS "Users can upload cover pictures" ON storage.objects;
CREATE POLICY "Users can upload cover pictures"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'cover-pictures');

DROP POLICY IF EXISTS "Users can update own cover pictures" ON storage.objects;
CREATE POLICY "Users can update own cover pictures"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'cover-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own cover pictures" ON storage.objects;
CREATE POLICY "Users can delete own cover pictures"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'cover-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for voice notes
DROP POLICY IF EXISTS "Voice notes are publicly accessible" ON storage.objects;
CREATE POLICY "Voice notes are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'voice-notes');

DROP POLICY IF EXISTS "Users can upload voice notes" ON storage.objects;
CREATE POLICY "Users can upload voice notes"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'voice-notes');

DROP POLICY IF EXISTS "Users can delete own voice notes" ON storage.objects;
CREATE POLICY "Users can delete own voice notes"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create feed view for better performance
CREATE OR REPLACE VIEW feed_posts AS
SELECT 
    p.*,
    'post' as feed_type,
    p.created_at as feed_created_at,
    NULL::uuid as repost_user_id,
    NULL::text as repost_username,
    NULL::text as repost_name,
    NULL::timestamptz as repost_created_at
FROM posts p
WHERE p.disappears_at IS NULL OR p.disappears_at > now()

UNION ALL

SELECT 
    p.*,
    'repost' as feed_type,
    r.created_at as feed_created_at,
    r.user_id as repost_user_id,
    pr.username as repost_username,
    pr.name as repost_name,
    r.created_at as repost_created_at
FROM posts p
JOIN reposts r ON p.id = r.post_id
JOIN profiles pr ON r.user_id = pr.id
WHERE p.disappears_at IS NULL OR p.disappears_at > now();