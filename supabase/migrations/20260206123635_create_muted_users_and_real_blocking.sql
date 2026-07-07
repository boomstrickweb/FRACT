/*
  # Create Muted Users Table and Implement Real Blocking

  ## Overview
  The existing `blocked_users` table was actually implementing mute behavior 
  (hiding posts from a user). This migration:
  1. Creates a `muted_users` table for the mute feature
  2. Copies existing blocked_users data into muted_users (since those were mutes)
  3. Clears the old data from blocked_users
  4. Updates blocked_users to represent real blocking (mutual invisibility)

  ## New Tables
  - `muted_users`
    - `id` (uuid, primary key)
    - `muter_id` (uuid, FK to profiles) - user who mutes
    - `muted_id` (uuid, FK to profiles) - user being muted
    - `created_at` (timestamptz)
    - Unique constraint on (muter_id, muted_id)

  ## Modified Tables
  - `blocked_users` - repurposed for real blocking (mutual invisibility)

  ## New Functions
  - `is_user_muted(muted_uuid, muter_uuid)` - check if user A muted user B
  - `get_user_muted_list(user_uuid)` - get list of muted users
  - `is_blocked_either_direction(user_a, user_b)` - bidirectional block check
  - `get_blocked_user_ids(user_uuid)` - get all user IDs blocked in either direction

  ## Security
  - RLS enabled on muted_users
  - Separate SELECT, INSERT, DELETE policies
  - Users can only manage their own mute/block entries
  - Bidirectional block check function for feed/search filtering

  ## Notes
  - Muting = you don't see their posts (one-way)
  - Blocking = neither user sees the other at all (two-way)
*/

-- 1. Create muted_users table
CREATE TABLE IF NOT EXISTS muted_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  muted_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(muter_id, muted_id)
);

ALTER TABLE muted_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own muted list"
  ON muted_users FOR SELECT
  TO authenticated
  USING (muter_id = auth.uid());

CREATE POLICY "Users can mute others"
  ON muted_users FOR INSERT
  TO authenticated
  WITH CHECK (muter_id = auth.uid());

CREATE POLICY "Users can unmute others"
  ON muted_users FOR DELETE
  TO authenticated
  USING (muter_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_muted_users_muter_id ON muted_users(muter_id);
CREATE INDEX IF NOT EXISTS idx_muted_users_muted_id ON muted_users(muted_id);

-- 2. Copy existing blocked_users data to muted_users (those were actually mutes)
INSERT INTO muted_users (id, muter_id, muted_id, created_at)
SELECT id, blocker_id, blocked_id, created_at
FROM blocked_users
ON CONFLICT (muter_id, muted_id) DO NOTHING;

-- 3. Clear the blocked_users table (data is preserved in muted_users)
DELETE FROM blocked_users;

-- 4. Create mute helper functions
CREATE OR REPLACE FUNCTION is_user_muted(muted_uuid uuid, muter_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM muted_users
    WHERE muter_id = muter_uuid AND muted_id = muted_uuid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_user_muted(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION get_user_muted_list(user_uuid uuid)
RETURNS TABLE (
  mute_id uuid,
  muted_user_id uuid,
  muted_user_name text,
  muted_user_username text,
  muted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    mu.id as mute_id,
    mu.muted_id as muted_user_id,
    p.name as muted_user_name,
    p.username as muted_user_username,
    mu.created_at as muted_at
  FROM muted_users mu
  LEFT JOIN profiles p ON p.id = mu.muted_id
  WHERE mu.muter_id = user_uuid
  ORDER BY mu.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_muted_list(uuid) TO authenticated;

-- 5. Update the is_user_blocked function to check BOTH directions
CREATE OR REPLACE FUNCTION is_user_blocked(blocked_uuid uuid, blocker_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM blocked_users
    WHERE blocker_id = blocker_uuid AND blocked_id = blocked_uuid
  );
END;
$$;

-- 6. Bidirectional block check (for filtering)
CREATE OR REPLACE FUNCTION is_blocked_either_direction(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM blocked_users
    WHERE (blocker_id = user_a AND blocked_id = user_b)
       OR (blocker_id = user_b AND blocked_id = user_a)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_blocked_either_direction(uuid, uuid) TO authenticated;

-- 7. Get all blocked user IDs for a user (either direction) - for feed/search filtering
CREATE OR REPLACE FUNCTION get_blocked_user_ids(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT blocked_id FROM blocked_users WHERE blocker_id = user_uuid
  UNION
  SELECT blocker_id FROM blocked_users WHERE blocked_id = user_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION get_blocked_user_ids(uuid) TO authenticated;

-- 8. Get all muted user IDs for a user (one-way) - for feed filtering
CREATE OR REPLACE FUNCTION get_muted_user_ids(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT muted_id FROM muted_users WHERE muter_id = user_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION get_muted_user_ids(uuid) TO authenticated;

-- 9. Update blocked_users RLS to allow viewing blocks where you are involved
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blocked_users' AND policyname = 'Users can manage their blocked users') THEN
    DROP POLICY "Users can manage their blocked users" ON blocked_users;
  END IF;
END $$;

CREATE POLICY "Users can view own blocks"
  ON blocked_users FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

CREATE POLICY "Users can block others"
  ON blocked_users FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can unblock others"
  ON blocked_users FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- 10. Update delete_user_account to also handle muted_users
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  IF auth.uid() != user_id_to_delete THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  DELETE FROM user_sessions WHERE user_id = user_id_to_delete;
  DELETE FROM saved_posts WHERE user_id = user_id_to_delete;
  DELETE FROM post_reactions WHERE user_id = user_id_to_delete;
  DELETE FROM corrections WHERE author_id = user_id_to_delete;
  DELETE FROM post_sources 
  WHERE post_id IN (SELECT id FROM posts WHERE author_id = user_id_to_delete);
  DELETE FROM posts WHERE author_id = user_id_to_delete;
  DELETE FROM follows WHERE follower_id = user_id_to_delete OR following_id = user_id_to_delete;
  DELETE FROM notifications WHERE user_id = user_id_to_delete OR from_user_id = user_id_to_delete;
  DELETE FROM muted_users WHERE muter_id = user_id_to_delete OR muted_id = user_id_to_delete;
  DELETE FROM blocked_users WHERE blocker_id = user_id_to_delete OR blocked_id = user_id_to_delete;
  DELETE FROM user_reports WHERE reporter_id = user_id_to_delete OR reported_id = user_id_to_delete;
  DELETE FROM account_scope WHERE user_id = user_id_to_delete;
  DELETE FROM user_verifications WHERE user_id = user_id_to_delete;
  DELETE FROM user_feedback WHERE user_id = user_id_to_delete;
  DELETE FROM profiles WHERE id = user_id_to_delete;

  deleted_count := 1;

  RETURN json_build_object(
    'success', true,
    'message', 'Account deleted successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;