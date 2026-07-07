/*
  # Add Action Password Support
  
  1. Changes
    - Add `action_password_hash` to `profiles` table
    - Add `action_password_settings` to `profiles` table
*/

-- Add columns to profiles table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'action_password_hash'
  ) THEN
    ALTER TABLE profiles ADD COLUMN action_password_hash text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'action_password_settings'
  ) THEN
    ALTER TABLE profiles ADD COLUMN action_password_settings jsonb DEFAULT '{"login": false, "createPost": false, "editProfile": false, "settings": false, "deleteAccount": true}'::jsonb;
  END IF;
END $$;

-- Update the restricted profile update policy to include action password fields
-- This ensures users cannot bypass the Edge Function to change their password hash directly
DO $$
BEGIN
  -- Drop existing if we're re-running, though usually migrations are incremental
  DROP POLICY IF EXISTS "Users can update own profile (restricted)" ON profiles;
  
  CREATE POLICY "Users can update own profile (restricted)"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
      auth.uid() = id
      AND (is_verified IS NOT DISTINCT FROM (SELECT is_verified FROM profiles WHERE id = auth.uid()))
      AND (verification_type IS NOT DISTINCT FROM (SELECT verification_type FROM profiles WHERE id = auth.uid()))
      AND (verification_reason IS NOT DISTINCT FROM (SELECT verification_reason FROM profiles WHERE id = auth.uid()))
      AND (trust_score IS NOT DISTINCT FROM (SELECT trust_score FROM profiles WHERE id = auth.uid()))
      AND (password_hash IS NOT DISTINCT FROM (SELECT password_hash FROM profiles WHERE id = auth.uid()))
      -- NEW: Protect action password fields from direct manipulation
      AND (action_password_hash IS NOT DISTINCT FROM (SELECT action_password_hash FROM profiles WHERE id = auth.uid()))
      AND (action_password_settings IS NOT DISTINCT FROM (SELECT action_password_settings FROM profiles WHERE id = auth.uid()))
    );
END $$;
