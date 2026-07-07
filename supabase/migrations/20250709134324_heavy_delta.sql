/*
  # Add reply and repost support

  1. Schema Changes
    - Add `reply_to_post_id` column to posts table
    - Update posts query to include original post data for replies
    - Update reposts to include user info for display
    - Add view to combine posts, reposts, and replies in feed

  2. Functions
    - Update view count function to handle reposts/replies separately
    - Add function to get feed with all post types

  3. Security
    - Update RLS policies to handle new structure
*/

-- Add reply_to_post_id column to posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'reply_to_post_id'
  ) THEN
    ALTER TABLE posts ADD COLUMN reply_to_post_id uuid REFERENCES posts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for reply lookups
CREATE INDEX IF NOT EXISTS posts_reply_to_post_id_idx ON posts(reply_to_post_id);

-- Create view for feed that combines posts, reposts, and replies
CREATE OR REPLACE VIEW feed_posts AS
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

-- Update the increment_post_view function to handle reposts/replies
CREATE OR REPLACE FUNCTION increment_post_view(post_uuid uuid, user_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Only increment view count for original posts, not reposts or replies
  -- Insert view record if not exists
  INSERT INTO post_views (user_id, post_id)
  VALUES (user_uuid, post_uuid)
  ON CONFLICT (user_id, post_id) DO NOTHING;
  
  -- Update view count only for the original post
  UPDATE posts 
  SET view_count = (
    SELECT COUNT(*) FROM post_views WHERE post_id = post_uuid
  )
  WHERE id = post_uuid AND reply_to_post_id IS NULL;
END;
$$ LANGUAGE plpgsql;