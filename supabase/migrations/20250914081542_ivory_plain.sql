/*
  # Fix verification defaults

  1. Changes
    - Remove default verification_type from profiles table
    - Set is_verified to false by default for all users
    - Clean up any existing default verifications
    - Remove any automatic verification creation

  2. Security
    - Ensure only manual verification is possible
*/

-- Remove default verification_type from profiles if it exists
ALTER TABLE profiles ALTER COLUMN verification_type DROP DEFAULT;

-- Ensure is_verified defaults to false
ALTER TABLE profiles ALTER COLUMN is_verified SET DEFAULT false;

-- Update all existing users to not be verified by default
UPDATE profiles 
SET is_verified = false, verification_type = null 
WHERE verification_type = 'fract_user' OR is_verified = true;

-- Remove any default verification records that were auto-created
DELETE FROM user_verifications 
WHERE verification_type = 'fract_user' AND verification_reason = 'This account is verified because it represents a microblog app.';

-- Ensure verification_type in user_verifications has no default
ALTER TABLE user_verifications ALTER COLUMN verification_type DROP DEFAULT;