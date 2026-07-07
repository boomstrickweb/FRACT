/*
  # Remove default verification for users

  1. Changes
    - Remove default value from verification_type column in user_verifications table
    - This ensures users are not automatically verified

  2. Security
    - Maintains existing RLS policies
    - Only affects default behavior, not existing verified users
*/

-- Remove the default value from verification_type column
ALTER TABLE user_verifications 
ALTER COLUMN verification_type DROP DEFAULT;

-- Also ensure no automatic verification records are created
-- by removing any triggers that might auto-create verification records