/*
  # Add missing columns to user_reports table

  1. Schema Changes
    - Add `description` column to store detailed report descriptions
    - Add `report_type` column to categorize different types of reports
  
  2. Data Migration
    - Set default values for existing records
    - Update existing records to have proper report types
*/

-- Add missing columns to user_reports table
DO $$
BEGIN
  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_reports' AND column_name = 'description'
  ) THEN
    ALTER TABLE user_reports ADD COLUMN description text;
  END IF;

  -- Add report_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_reports' AND column_name = 'report_type'
  ) THEN
    ALTER TABLE user_reports ADD COLUMN report_type text DEFAULT 'inappropriate_behavior';
  END IF;
END $$;