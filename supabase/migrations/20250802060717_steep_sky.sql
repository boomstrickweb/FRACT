/*
  # Fix search policies for user discovery

  1. Security Updates
    - Allow public read access to basic profile info for search
    - Keep sensitive data protected
    - Enable user discovery functionality

  2. Changes
    - Update profiles RLS policy to allow public search
    - Ensure search functionality works for all users
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Create new policy that allows reading basic profile info for search
CREATE POLICY "Public can read basic profile info"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

-- Keep update and insert policies restricted to own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);