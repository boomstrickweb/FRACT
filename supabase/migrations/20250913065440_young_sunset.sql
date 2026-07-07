/*
  # Add privacy settings to profiles table

  1. New Columns
    - `show_following` (boolean, default false) - Controls visibility of following list
    - `show_respected_posts` (boolean, default false) - Controls visibility of respected posts
    - `show_rejected_posts` (boolean, default false) - Controls visibility of rejected posts
    - `show_observed_posts` (boolean, default false) - Controls visibility of observed posts

  2. Security
    - All columns default to false (private by default)
    - Users can update their own privacy settings via existing RLS policies
*/

-- Add privacy setting columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'show_following'
  ) THEN
    ALTER TABLE profiles ADD COLUMN show_following boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'show_respected_posts'
  ) THEN
    ALTER TABLE profiles ADD COLUMN show_respected_posts boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'show_rejected_posts'
  ) THEN
    ALTER TABLE profiles ADD COLUMN show_rejected_posts boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'show_observed_posts'
  ) THEN
    ALTER TABLE profiles ADD COLUMN show_observed_posts boolean DEFAULT false;
  END IF;
END $$;