/*
  # Add Privacy, Security, and Moderation Features

  1. New Tables
    - `blocked_users` - Track blocked user relationships
    - `user_reports` - Track user reports for moderation
    - `muted_words` - Store user's muted words (alternative to localStorage)
  
  2. Profile Updates
    - Add deactivation fields
    - Add two-factor authentication fields
  
  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for user privacy
*/

-- Add deactivation and 2FA fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_deactivated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_password text;

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own blocks"
  ON blocked_users
  FOR ALL
  TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- Create user_reports table
CREATE TABLE IF NOT EXISTS user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON user_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON user_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Create muted_words table (optional - can use localStorage instead)
CREATE TABLE IF NOT EXISTS muted_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  word text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, word)
);

ALTER TABLE muted_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own muted words"
  ON muted_words
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to completely delete a user and all their data
CREATE OR REPLACE FUNCTION delete_user_completely(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all user's posts (cascades to reactions, saves, etc.)
  DELETE FROM posts WHERE author_id = user_uuid;
  
  -- Delete all follows
  DELETE FROM follows WHERE follower_id = user_uuid OR following_id = user_uuid;
  
  -- Delete all blocks
  DELETE FROM blocked_users WHERE blocker_id = user_uuid OR blocked_id = user_uuid;
  
  -- Delete all reports
  DELETE FROM user_reports WHERE reporter_id = user_uuid OR reported_id = user_uuid;
  
  -- Delete muted words
  DELETE FROM muted_words WHERE user_id = user_uuid;
  
  -- Delete notifications
  DELETE FROM notifications WHERE user_id = user_uuid OR related_user_id = user_uuid;
  
  -- Finally delete the profile
  DELETE FROM profiles WHERE id = user_uuid;
  
  -- Delete from auth.users (this will cascade delete the profile if it still exists)
  DELETE FROM auth.users WHERE id = user_uuid;
END;
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS blocked_users_blocker_id_idx ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_id_idx ON blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS user_reports_reporter_id_idx ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS user_reports_reported_id_idx ON user_reports(reported_id);
CREATE INDEX IF NOT EXISTS muted_words_user_id_idx ON muted_words(user_id);