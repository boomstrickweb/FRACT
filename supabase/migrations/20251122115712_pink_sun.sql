/*
  # Fix reported users RLS policies

  1. Security
    - Allow users to view their own reports
    - Allow users to see basic info of reported users for display
  
  2. Changes
    - Update user_reports RLS policies
    - Ensure users can see reports they've made
    - Allow reading profiles of reported users
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create reports" ON user_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON user_reports;

-- Create proper RLS policies for user_reports
CREATE POLICY "Users can create reports" ON user_reports
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON user_reports
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = reporter_id);

-- Ensure profiles can be read for reported users (for display purposes)
-- This policy should already exist but let's make sure
DO $$
BEGIN
  -- Check if the policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Anyone can read profile info'
  ) THEN
    -- Create the policy if it doesn't exist
    CREATE POLICY "Anyone can read profile info" ON profiles
      FOR SELECT 
      TO anon, authenticated 
      USING (
        (is_deactivated = false) OR 
        (is_deactivated IS NULL) OR 
        (auth.uid() = id) OR 
        (id IN (
          SELECT blocked_id 
          FROM blocked_users 
          WHERE blocker_id = auth.uid()
        ))
      );
  END IF;
END $$;

-- Create an RPC function to get user reports (for debugging)
CREATE OR REPLACE FUNCTION get_user_reports(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  reported_id UUID,
  reason TEXT,
  report_type TEXT,
  description TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  reported_user_name TEXT,
  reported_user_username TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.id,
    ur.reported_id,
    ur.reason,
    ur.report_type,
    ur.description,
    ur.status,
    ur.created_at,
    p.name as reported_user_name,
    p.username as reported_user_username
  FROM user_reports ur
  LEFT JOIN profiles p ON p.id = ur.reported_id
  WHERE ur.reporter_id = user_uuid
  ORDER BY ur.created_at DESC;
END;
$$;