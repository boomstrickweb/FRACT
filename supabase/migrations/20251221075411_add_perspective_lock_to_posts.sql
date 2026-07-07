/*
  # Add Perspective Lock to Posts

  1. Changes
    - Add perspective_type enum type with values: 'opinion', 'question', 'hypothesis', 'personal_experience'
    - Add perspective_lock column to posts table (nullable, optional field)

  2. Details
    - The perspective_lock field allows users to categorize their posts by perspective type
    - This is an optional field that enhances post context
    - No RLS changes needed as it follows existing post permissions
*/

-- Create perspective type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'perspective_type') THEN
    CREATE TYPE perspective_type AS ENUM ('opinion', 'question', 'hypothesis', 'personal_experience');
  END IF;
END $$;

-- Add perspective_lock column to posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'perspective_lock'
  ) THEN
    ALTER TABLE posts ADD COLUMN perspective_lock perspective_type;
  END IF;
END $$;
