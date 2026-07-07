/*
  # Add missing profile columns

  1. New Columns
    - `beliefs` (text, nullable) - User's belief system/ideology
    - `field` (text, nullable) - User's field of interest
    - `cover_pic_url` (text, nullable) - URL for user's cover photo

  2. Changes
    - Add three new optional columns to profiles table
    - These columns support the enhanced profile functionality in EditProfile component
*/

-- Add missing columns to profiles table
DO $$
BEGIN
  -- Add beliefs column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'beliefs'
  ) THEN
    ALTER TABLE profiles ADD COLUMN beliefs text;
  END IF;

  -- Add field column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'field'
  ) THEN
    ALTER TABLE profiles ADD COLUMN field text;
  END IF;

  -- Add cover_pic_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'cover_pic_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN cover_pic_url text;
  END IF;
END $$;