/*
  # Create missing tables for privacy, security, and moderation features

  1. New Tables
    - `blocked_users`
      - `id` (uuid, primary key)
      - `blocker_id` (uuid, foreign key to profiles.id)
      - `blocked_id` (uuid, foreign key to profiles.id)
      - `created_at` (timestamp)
    - `user_reports`
      - `id` (uuid, primary key)
      - `reporter_id` (uuid, foreign key to profiles.id)
      - `reported_id` (uuid, foreign key to profiles.id)
      - `reason` (text)
      - `created_at` (timestamp)
    - `muted_words`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles.id)
      - `word` (text)
      - `created_at` (timestamp)
    - `user_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles.id)
      - `device_name` (text)
      - `location` (text)
      - `ip_address` (text)
      - `user_agent` (text)
      - `last_active` (timestamp)
      - `created_at` (timestamp)

  2. Profile Updates
    - Add missing columns for deactivation and 2FA features

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for each table
*/

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Create user_reports table
CREATE TABLE IF NOT EXISTS user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'inappropriate_behavior',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at timestamptz DEFAULT now()
);

-- Create muted_words table
CREATE TABLE IF NOT EXISTS muted_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  word text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, word)
);

-- Create user_sessions table for logged devices
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_name text NOT NULL DEFAULT 'Unknown Device',
  location text NOT NULL DEFAULT 'Unknown Location',
  ip_address text,
  user_agent text,
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add missing columns to profiles table
DO $$
BEGIN
  -- Add is_deactivated column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_deactivated'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_deactivated boolean DEFAULT false;
  END IF;

  -- Add deactivated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'deactivated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN deactivated_at timestamptz;
  END IF;

  -- Add two_factor_enabled column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'two_factor_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN two_factor_enabled boolean DEFAULT false;
  END IF;

  -- Add password_hash column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE profiles ADD COLUMN password_hash text;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS blocked_users_blocker_id_idx ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_id_idx ON blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS user_reports_reporter_id_idx ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS user_reports_reported_id_idx ON user_reports(reported_id);
CREATE INDEX IF NOT EXISTS muted_words_user_id_idx ON muted_words(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);

-- Enable RLS on all new tables
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE muted_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocked_users
CREATE POLICY "Users can manage their own blocked users"
  ON blocked_users
  FOR ALL
  TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- RLS Policies for user_reports
CREATE POLICY "Users can create reports"
  ON user_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
  ON user_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- RLS Policies for muted_words
CREATE POLICY "Users can manage their own muted words"
  ON muted_words
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions"
  ON user_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to delete user completely
CREATE OR REPLACE FUNCTION delete_user_completely(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete from all related tables
  DELETE FROM blocked_users WHERE blocker_id = user_uuid OR blocked_id = user_uuid;
  DELETE FROM user_reports WHERE reporter_id = user_uuid OR reported_id = user_uuid;
  DELETE FROM muted_words WHERE user_id = user_uuid;
  DELETE FROM user_sessions WHERE user_id = user_uuid;
  DELETE FROM post_reactions WHERE user_id = user_uuid;
  DELETE FROM saved_posts WHERE user_id = user_uuid;
  DELETE FROM reposts WHERE user_id = user_uuid;
  DELETE FROM post_views WHERE user_id = user_uuid;
  DELETE FROM follows WHERE follower_id = user_uuid OR following_id = user_uuid;
  DELETE FROM notifications WHERE user_id = user_uuid OR related_user_id = user_uuid;
  DELETE FROM posts WHERE author_id = user_uuid;
  DELETE FROM profiles WHERE id = user_uuid;
  
  -- Delete from auth.users (if accessible)
  -- Note: This might require additional permissions
  -- DELETE FROM auth.users WHERE id = user_uuid;
END;
$$;