/*
  # Add Hive Moderation System

  1. New Tables
    - `manual_review`: For user-initiated appeals (Low/Medium cases)
    - `high_manual_review`: For auto-flagged High severity cases and user appeals for High cases
  
  2. Table Changes
    - `posts`:
      - `moderation_score`: Store the severity score from Hive (1, 2, 3)
      - `is_quarantined`: Boolean to track if post is in quarantine (High severity)
    - `profiles`:
      - `ban_until`: Timestamp for temporary posting bans
*/

-- Add columns to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_score integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_quarantined boolean DEFAULT false;

-- Add columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_until timestamptz;

-- Add columns to reflections
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS moderation_score integer;
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS is_quarantined boolean DEFAULT false;
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS moderation_reason moderation_category DEFAULT 'NONE';

-- Create manual_review table
CREATE TABLE IF NOT EXISTS manual_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  reflection_id uuid REFERENCES reflections(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT one_of_target CHECK ((post_id IS NOT NULL AND reflection_id IS NULL) OR (post_id IS NULL AND reflection_id IS NOT NULL))
);

-- Create high_manual_review table
CREATE TABLE IF NOT EXISTS high_manual_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  reflection_id uuid REFERENCES reflections(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT one_of_target_high CHECK ((post_id IS NOT NULL AND reflection_id IS NULL) OR (post_id IS NULL AND reflection_id IS NOT NULL))
);

-- Enable RLS
ALTER TABLE manual_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE high_manual_review ENABLE ROW LEVEL SECURITY;

-- Policies for manual_review
CREATE POLICY "Users can create their own manual reviews"
  ON manual_review FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can see their own manual reviews"
  ON manual_review FOR SELECT
  USING (auth.uid() = user_id OR (SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- Policies for high_manual_review
CREATE POLICY "Users can see their own high manual reviews"
  ON high_manual_review FOR SELECT
  USING (auth.uid() = user_id OR (SELECT is_admin FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update high manual reviews"
  ON high_manual_review FOR UPDATE
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- Function to handle publishing quarantined posts
CREATE OR REPLACE FUNCTION publish_quarantined_post(target_post_id uuid DEFAULT NULL, target_reflection_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  SELECT is_admin INTO is_admin_user FROM profiles WHERE id = auth.uid();
  
  IF NOT COALESCE(is_admin_user, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF target_post_id IS NOT NULL THEN
    UPDATE posts
    SET is_quarantined = false,
        moderation_reason = 'NONE',
        moderation_score = NULL
    WHERE id = target_post_id;

    UPDATE high_manual_review
    SET status = 'reviewed'
    WHERE post_id = target_post_id;
  ELSIF target_reflection_id IS NOT NULL THEN
    UPDATE reflections
    SET is_quarantined = false,
        moderation_reason = 'NONE',
        moderation_score = NULL
    WHERE id = target_reflection_id;

    UPDATE high_manual_review
    SET status = 'reviewed'
    WHERE reflection_id = target_reflection_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
