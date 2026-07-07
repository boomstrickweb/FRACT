/*
  # Fix soulcode RLS policies - remove infinite recursion

  1. Security Changes
    - Drop all existing policies on soulcodes table
    - Create simple, non-recursive policies
    - Allow users to manage their own soulcode
    - Allow authenticated users to read soulcodes for matching

  This fixes the infinite recursion error by removing any self-referential queries.
*/

-- Drop all existing policies on soulcodes table
DROP POLICY IF EXISTS "Users can manage own soulcode" ON soulcodes;
DROP POLICY IF EXISTS "Users can view matching soulcodes" ON soulcodes;

-- Create simple, non-recursive policies
CREATE POLICY "Users can manage their own soulcode"
  ON soulcodes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can read all soulcodes"
  ON soulcodes
  FOR SELECT
  TO authenticated
  USING (true);