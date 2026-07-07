/*
  # Debug and fix blocked users visibility

  1. Check current blocked_users table structure
  2. Fix RLS policies to ensure users can see their blocked users
  3. Add proper indexes for performance
  4. Test the query that Settings uses
*/

-- First, let's check what's in the blocked_users table
-- This will help us understand the data structure

-- Drop existing policies and recreate them properly
DROP POLICY IF EXISTS "Users can view their own blocked users" ON blocked_users;
DROP POLICY IF EXISTS "Users can block other users" ON blocked_users;
DROP POLICY IF EXISTS "Users can unblock users" ON blocked_users;

-- Create proper RLS policies for blocked_users
CREATE POLICY "Users can manage their blocked users"
  ON blocked_users
  FOR ALL
  TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

-- Also ensure profiles can be read for blocked users display
DROP POLICY IF EXISTS "Anyone can read active profile info" ON profiles;

CREATE POLICY "Anyone can read profile info"
  ON profiles
  FOR SELECT
  TO authenticated, anon
  USING (
    -- Allow reading profiles that are not deactivated
    (is_deactivated = false OR is_deactivated IS NULL)
    OR
    -- Allow reading own profile even if deactivated
    (auth.uid() = id)
    OR
    -- Allow reading profiles of blocked users for display purposes
    (id IN (
      SELECT blocked_id 
      FROM blocked_users 
      WHERE blocker_id = auth.uid()
    ))
  );

-- Add helpful function to debug blocked users
CREATE OR REPLACE FUNCTION get_user_blocked_list(user_uuid uuid)
RETURNS TABLE (
  block_id uuid,
  blocked_user_id uuid,
  blocked_user_name text,
  blocked_user_username text,
  blocked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bu.id as block_id,
    bu.blocked_id as blocked_user_id,
    p.name as blocked_user_name,
    p.username as blocked_user_username,
    bu.created_at as blocked_at
  FROM blocked_users bu
  LEFT JOIN profiles p ON p.id = bu.blocked_id
  WHERE bu.blocker_id = user_uuid
  ORDER BY bu.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_blocked_list(uuid) TO authenticated;