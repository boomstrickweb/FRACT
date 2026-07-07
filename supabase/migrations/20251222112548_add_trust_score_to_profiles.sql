/*
  # Add Trust Score for Media Profiles

  ## Overview
  This migration adds a trust score system for media profiles to track their credibility
  and reliability over time.

  ## Changes to Existing Tables
  
  ### `profiles` table modifications
  - Add `trust_score` (integer) - Trust score for media profiles, defaults to 0
  - Trust score can be positive or negative based on community feedback and admin actions
  - Only applicable to media profile types

  ## Notes
  - Trust score starts at 0 for all profiles
  - Media profiles will display and track this score
  - Normal profiles will have trust_score but it won't be actively used
  - Can be extended in the future for reputation system
*/

-- Add trust_score column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'trust_score'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trust_score integer DEFAULT 0;
  END IF;
END $$;

-- Create index for efficient querying of trust scores
CREATE INDEX IF NOT EXISTS idx_profiles_trust_score ON profiles(trust_score) WHERE profile_type = 'media';
