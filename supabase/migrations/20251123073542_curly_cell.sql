/*
  # Add Soulcode System for Soulmate Matching

  1. New Tables
    - `soulcodes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `core_drive` (text)
      - `value_spectrum` (text)
      - `social_vibe` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `soulcodes` table
    - Add policies for users to manage their own soulcode
    - Soulcodes are private but visible to matched soulmates
*/

CREATE TABLE IF NOT EXISTS soulcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  core_drive text NOT NULL,
  value_spectrum text NOT NULL,
  social_vibe text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE soulcodes ENABLE ROW LEVEL SECURITY;

-- Users can manage their own soulcode
CREATE POLICY "Users can manage own soulcode"
  ON soulcodes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can view soulcodes of their matches (all 3 criteria match)
CREATE POLICY "Users can view matching soulcodes"
  ON soulcodes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM soulcodes user_soulcode
      WHERE user_soulcode.user_id = auth.uid()
      AND user_soulcode.core_drive = soulcodes.core_drive
      AND user_soulcode.value_spectrum = soulcodes.value_spectrum
      AND user_soulcode.social_vibe = soulcodes.social_vibe
    )
  );

-- Function to find soulmate matches
CREATE OR REPLACE FUNCTION find_soulmate_matches(user_uuid uuid)
RETURNS TABLE (
  user_id uuid,
  name text,
  username text,
  bio text,
  profile_pic_url text,
  created_at timestamptz,
  is_verified boolean,
  verification_type text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.username,
    p.bio,
    p.profile_pic_url,
    p.created_at,
    p.is_verified,
    p.verification_type
  FROM profiles p
  JOIN soulcodes s1 ON p.id = s1.user_id
  JOIN soulcodes s2 ON s2.user_id = user_uuid
  WHERE s1.core_drive = s2.core_drive
    AND s1.value_spectrum = s2.value_spectrum
    AND s1.social_vibe = s2.social_vibe
    AND p.id != user_uuid
    AND (p.is_deactivated = false OR p.is_deactivated IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get soulmate posts feed
CREATE OR REPLACE FUNCTION get_soulmate_posts_feed(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  author_id uuid,
  content text,
  post_type text,
  quote_signature text,
  voice_url text,
  is_explicit boolean,
  is_anonymous boolean,
  disappears_at timestamptz,
  view_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  reply_to_post_id uuid,
  author_name text,
  author_username text,
  author_profile_pic_url text,
  author_is_verified boolean,
  author_verification_type text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    posts.id,
    posts.author_id,
    posts.content,
    posts.post_type::text,
    posts.quote_signature,
    posts.voice_url,
    posts.is_explicit,
    posts.is_anonymous,
    posts.disappears_at,
    posts.view_count,
    posts.created_at,
    posts.updated_at,
    posts.reply_to_post_id,
    profiles.name,
    profiles.username,
    profiles.profile_pic_url,
    profiles.is_verified,
    profiles.verification_type
  FROM posts
  JOIN profiles ON posts.author_id = profiles.id
  WHERE posts.author_id IN (
    SELECT p.id
    FROM profiles p
    JOIN soulcodes s1 ON p.id = s1.user_id
    JOIN soulcodes s2 ON s2.user_id = user_uuid
    WHERE s1.core_drive = s2.core_drive
      AND s1.value_spectrum = s2.value_spectrum
      AND s1.social_vibe = s2.social_vibe
      AND p.id != user_uuid
      AND (p.is_deactivated = false OR p.is_deactivated IS NULL)
  )
  AND ((posts.disappears_at IS NULL) OR (posts.disappears_at > now()))
  AND (profiles.is_deactivated = false OR profiles.is_deactivated IS NULL)
  ORDER BY posts.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;