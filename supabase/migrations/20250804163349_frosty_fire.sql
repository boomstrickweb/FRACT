/*
  # Create follows system

  1. New Tables
    - `follows`
      - `id` (uuid, primary key)
      - `follower_id` (uuid, references profiles)
      - `following_id` (uuid, references profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `follows` table
    - Add policies for follow/unfollow operations
    - Add policies for viewing follows

  3. Indexes
    - Add indexes for efficient follow queries
    - Add unique constraint to prevent duplicate follows
*/

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows(following_id);
CREATE INDEX IF NOT EXISTS follows_created_at_idx ON follows(created_at DESC);

-- RLS Policies
CREATE POLICY "Users can view all follows"
  ON follows
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id AND follower_id != following_id);

CREATE POLICY "Users can unfollow others"
  ON follows
  FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Function to get follow counts
CREATE OR REPLACE FUNCTION get_follow_counts(user_uuid uuid)
RETURNS TABLE(followers_count bigint, following_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM follows WHERE following_id = user_uuid) as followers_count,
    (SELECT COUNT(*) FROM follows WHERE follower_id = user_uuid) as following_count;
END;
$$;

-- Function to check if user is following another user
CREATE OR REPLACE FUNCTION is_following(follower_uuid uuid, following_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM follows 
    WHERE follower_id = follower_uuid AND following_id = following_uuid
  );
END;
$$;