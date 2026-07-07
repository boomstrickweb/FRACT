/*
  # Add verification_reason column to user_verifications table

  1. Changes
    - Add `verification_reason` column to `user_verifications` table
    - Set it as TEXT type to store the reason for verification
    - Allow NULL values since existing records won't have this field
    - Add default value for better UX

  2. Security
    - No changes to RLS policies needed
    - Column inherits existing table permissions
*/

-- Add verification_reason column to user_verifications table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_verifications' AND column_name = 'verification_reason'
  ) THEN
    ALTER TABLE user_verifications ADD COLUMN verification_reason TEXT;
  END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN user_verifications.verification_reason IS 'Reason why this user was verified';