/*
  # Update User Reports Status to Use Enum Type

  1. Changes
    - Create enum type for report status: 'pending', 'upheld', 'dismissed'
    - Update user_reports to use enum type
    - Update RLS policies to allow authenticated users to update report status
  
  2. Security
    - Authenticated users can update report status
    - Status can only be one of three values: pending, upheld, dismissed
*/

-- Create enum type for report status
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'upheld', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update user_reports table to use enum
ALTER TABLE user_reports 
  DROP CONSTRAINT IF EXISTS user_reports_status_check;

ALTER TABLE user_reports 
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE user_reports 
  ALTER COLUMN status TYPE report_status 
  USING status::report_status;

ALTER TABLE user_reports 
  ALTER COLUMN status SET DEFAULT 'pending'::report_status;

-- Update RLS policies to allow authenticated users to update status
DROP POLICY IF EXISTS "Admins can update user reports" ON user_reports;

CREATE POLICY "Authenticated users can update user report status"
  ON user_reports
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);