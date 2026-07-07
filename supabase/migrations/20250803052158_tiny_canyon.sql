/*
  # Fix all user interaction policies

  1. Database Policies
    - Allow all users to read basic profile information
    - Enable proper search functionality
    - Keep write permissions restricted to own profile

  2. Security
    - Public read access for profiles (name, username, profile_pic_url, bio)
    - Protected write access (users can only edit their own profile)
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new open policies for reading profiles
CREATE POLICY "Anyone can read basic profile info"
  ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Keep write permissions restricted
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure profiles table has proper indexes for search
CREATE INDEX IF NOT EXISTS profiles_name_search_idx ON profiles USING gin(to_tsvector('english', coalesce(name, '')));
CREATE INDEX IF NOT EXISTS profiles_username_search_idx ON profiles USING btree(username);
CREATE INDEX IF NOT EXISTS profiles_id_search_idx ON profiles USING btree(id);