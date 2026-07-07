/*
  # Add profile completion fields

  1. New Columns
    - `username` (text, unique) - User's unique username
    - `name` (text) - User's display name
    - `bio` (text) - User's bio/description
    - `profile_pic_url` (text) - URL to profile picture
    - `profile_completed` (boolean) - Whether user has completed profile setup

  2. Security
    - Update existing policies to work with new fields
    - Add unique constraint for username
    - Add index for username lookups

  3. Storage
    - Create storage bucket for profile pictures
*/

-- Add new columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bio text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_pic_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_pic_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_completed boolean DEFAULT false;
  END IF;
END $$;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for profile pictures
CREATE POLICY "Users can upload their own profile pictures"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Profile pictures are publicly viewable"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can update their own profile pictures"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile pictures"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);