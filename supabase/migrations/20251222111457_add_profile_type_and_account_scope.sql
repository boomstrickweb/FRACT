/*
  # Add Profile Type and Account Scope Declaration

  ## Overview
  This migration adds profile type support (normal vs media) and account scope declaration
  for media profiles to define their coverage areas.

  ## Changes to Existing Tables
  
  ### `profiles` table modifications
  - Add `profile_type` (text) - Type of profile: 'normal' or 'media', defaults to 'normal'
  - Add `media_converted_at` (timestamptz) - When the profile was converted to media

  ## New Tables
  
  ### `account_scope_covers`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References the user who owns this scope
  - `topic` (text) - The topic/category this account covers
  - `created_at` (timestamptz) - When this was added

  ### `account_scope_does_not_cover`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References the user who owns this scope
  - `item` (text) - The item/category this account does not cover
  - `created_at` (timestamptz) - When this was added

  ## Security
  - Enable RLS on both new tables
  - Users can manage their own scope declarations
  - Public can read media profile scope declarations (for transparency)
*/

-- Add profile_type column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_type text DEFAULT 'normal' CHECK (profile_type IN ('normal', 'media'));
  END IF;
END $$;

-- Add media_converted_at column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'media_converted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN media_converted_at timestamptz;
  END IF;
END $$;

-- Create account_scope_covers table
CREATE TABLE IF NOT EXISTS account_scope_covers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, topic)
);

-- Create account_scope_does_not_cover table
CREATE TABLE IF NOT EXISTS account_scope_does_not_cover (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_profile_type ON profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_account_scope_covers_user_id ON account_scope_covers(user_id);
CREATE INDEX IF NOT EXISTS idx_account_scope_does_not_cover_user_id ON account_scope_does_not_cover(user_id);

-- Enable RLS
ALTER TABLE account_scope_covers ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_scope_does_not_cover ENABLE ROW LEVEL SECURITY;

-- RLS Policies for account_scope_covers

-- Allow public to view media profile scope declarations (for transparency)
CREATE POLICY "Public can view media profile scopes"
  ON account_scope_covers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = account_scope_covers.user_id
      AND profiles.profile_type = 'media'
    )
  );

-- Allow users to view their own scope
CREATE POLICY "Users can view own scope"
  ON account_scope_covers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to insert their own scope
CREATE POLICY "Users can insert own scope"
  ON account_scope_covers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own scope
CREATE POLICY "Users can delete own scope"
  ON account_scope_covers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for account_scope_does_not_cover

-- Allow public to view what media profiles do not cover (for transparency)
CREATE POLICY "Public can view media profile exclusions"
  ON account_scope_does_not_cover
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = account_scope_does_not_cover.user_id
      AND profiles.profile_type = 'media'
    )
  );

-- Allow users to view their own exclusions
CREATE POLICY "Users can view own exclusions"
  ON account_scope_does_not_cover
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to insert their own exclusions
CREATE POLICY "Users can insert own exclusions"
  ON account_scope_does_not_cover
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own exclusions
CREATE POLICY "Users can delete own exclusions"
  ON account_scope_does_not_cover
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
