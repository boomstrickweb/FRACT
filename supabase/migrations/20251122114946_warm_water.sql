/*
  # Fix blocked users policies and visibility

  1. Security Updates
    - Update RLS policies for blocked_users table
    - Ensure users can see their own blocked users list
    - Fix profile visibility for blocked users

  2. Policy Changes
    - Allow users to view their blocked users with profile info
    - Maintain security while showing necessary data
*/

-- Update blocked_users policies to allow viewing blocked user profiles
DROP POLICY IF EXISTS "Users can manage their own blocked users" ON blocked_users;

-- Create separate policies for better control
CREATE POLICY "Users can view their own blocked users"
  ON blocked_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block other users"
  ON blocked_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id AND blocker_id != blocked_id);

CREATE POLICY "Users can unblock users"
  ON blocked_users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Ensure profiles can be viewed for blocked users list (but not in general browsing)
-- This is handled by the existing profile policies which already allow viewing
-- We just need to make sure the Settings component can load the blocked user profiles