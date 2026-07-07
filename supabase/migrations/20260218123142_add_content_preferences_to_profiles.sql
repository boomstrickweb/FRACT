/*
  # Add Content Preferences to Profiles

  ## Summary
  Adds user-controlled content filtering preferences to the profiles table.

  ## Changes
  ### Modified Tables
  - `profiles`
    - `hide_ai_posts` (boolean, default false) — when true, AI-flagged posts are hidden everywhere in the feed

  ## Notes
  - Default is false (show all posts) to preserve current behavior for all existing users
  - This column is user-controlled and protected by existing RLS on the profiles table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'hide_ai_posts'
  ) THEN
    ALTER TABLE profiles ADD COLUMN hide_ai_posts boolean NOT NULL DEFAULT false;
  END IF;
END $$;
