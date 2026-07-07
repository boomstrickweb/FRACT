/*
  # Ensure no automatic verification

  1. Changes
    - Ensure is_verified defaults to false in profiles table
    - Remove any existing auto-verification logic

  2. Security
    - Maintains existing RLS policies
    - Ensures manual control over verification
*/

-- Ensure is_verified defaults to false (it should already, but let's be explicit)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'is_verified'
    AND column_default != 'false'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN is_verified SET DEFAULT false;
  END IF;
END $$;

-- Remove verification_type default from profiles if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'verification_type'
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE profiles ALTER COLUMN verification_type DROP DEFAULT;
  END IF;
END $$;