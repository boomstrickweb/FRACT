-- Fix RLS policies for manual review tables
-- Drop existing policies if they exist to ensure a clean state
DROP POLICY IF EXISTS "Users can create their own high manual reviews" ON high_manual_review;
DROP POLICY IF EXISTS "Users can create their own manual reviews" ON manual_review;

-- Re-create INSERT policy for high_manual_review with explicit authenticated role
CREATE POLICY "Users can insert their own high manual reviews"
  ON high_manual_review FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Re-create INSERT policy for manual_review with explicit authenticated role
CREATE POLICY "Users can insert their own manual reviews"
  ON manual_review FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure users can see their own reviews (already exists but re-enforcing)
DROP POLICY IF EXISTS "Users can see their own high manual reviews" ON high_manual_review;
CREATE POLICY "Users can see their own high manual reviews"
  ON high_manual_review FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR (SELECT is_admin FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can see their own manual reviews" ON manual_review;
CREATE POLICY "Users can see their own manual reviews"
  ON manual_review FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR (SELECT is_admin FROM profiles WHERE id = auth.uid()));
