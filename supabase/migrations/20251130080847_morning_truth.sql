/*
  # Ensure verification_reason column exists in profiles table

  1. Changes
    - Add verification_reason column to profiles table if it doesn't exist
    - Set it as TEXT type to store verification reasons
    - Allow NULL values for existing users
    - Add comment for documentation

  2. Security
    - No RLS changes needed as profiles table already has RLS enabled
*/

-- Add verification_reason column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verification_reason'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_reason TEXT;
    COMMENT ON COLUMN profiles.verification_reason IS 'Reason why this user was verified';
  END IF;
END $$;