/*
  # Add Feed Filter Preferences to Profiles

  ## Summary
  Adds category-based feed filtering columns to the profiles table.

  ## Changes
  ### Modified Tables
  - `profiles`
    - `mixed_feed` (boolean, default true) — when true, the user sees posts from ALL categories.
      If false, only posts from `interest_categories` are shown.
    - `interest_categories` (text[], default '{}') — categories the user wants to see
      when Mixed Feed is OFF. Posts must belong to one of these categories.
    - `excluded_categories` (text[], default '{}') — categories the user wants to exclude
      when Mixed Feed is ON. Posts belonging to these categories are hidden.

  ## Category Values
  Valid category IDs: 'tech', 'science', 'human', 'arts', 'economy', 'politics'

  ## Notes
  - mixed_feed defaults to true so all existing users continue to see all content
  - Empty excluded_categories means no exclusions — see everything
  - Empty interest_categories with mixed_feed OFF effectively shows nothing (user must select at least one)
  - These columns are user-controlled and protected by existing RLS on the profiles table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'mixed_feed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN mixed_feed boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'interest_categories'
  ) THEN
    ALTER TABLE profiles ADD COLUMN interest_categories text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'excluded_categories'
  ) THEN
    ALTER TABLE profiles ADD COLUMN excluded_categories text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;
