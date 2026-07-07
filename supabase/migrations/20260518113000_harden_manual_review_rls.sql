-- Hardened RLS policies for manual review tables
-- This migration ensures that both manual_review and high_manual_review tables
-- have the correct INSERT and SELECT policies, explicitly targeting authenticated users.

-- 1. high_manual_review table
DROP POLICY IF EXISTS "Users can create their own high manual reviews" ON high_manual_review;
DROP POLICY IF EXISTS "Users can insert their own high manual reviews" ON high_manual_review;
DROP POLICY IF EXISTS "Users can see their own high manual reviews" ON high_manual_review;

-- Re-create INSERT policy with explicit grants and checks
CREATE POLICY "authenticated_insert_high_manual_review"
  ON high_manual_review FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Re-create SELECT policy to allow users and admins
CREATE POLICY "authenticated_select_high_manual_review"
  ON high_manual_review FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR (SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- Ensure the table has RLS enabled
ALTER TABLE high_manual_review ENABLE ROW LEVEL SECURITY;

-- 2. manual_review table
DROP POLICY IF EXISTS "Users can create their own manual reviews" ON manual_review;
DROP POLICY IF EXISTS "Users can insert their own manual reviews" ON manual_review;
DROP POLICY IF EXISTS "Users can see their own manual reviews" ON manual_review;

-- Re-create INSERT policy
CREATE POLICY "authenticated_insert_manual_review"
  ON manual_review FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Re-create SELECT policy
CREATE POLICY "authenticated_select_manual_review"
  ON manual_review FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR (SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- Ensure the table has RLS enabled
ALTER TABLE manual_review ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated role just in case
GRANT INSERT, SELECT, UPDATE ON high_manual_review TO authenticated;
GRANT INSERT, SELECT, UPDATE ON manual_review TO authenticated;
GRANT ALL ON high_manual_review TO service_role;
GRANT ALL ON manual_review TO service_role;
