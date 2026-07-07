
-- Add is_anniversary column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_anniversary BOOLEAN DEFAULT FALSE;
