-- Add sexual_orientation and sexual_orientation_consent columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS sexual_orientation TEXT,
ADD COLUMN IF NOT EXISTS sexual_orientation_consent BOOLEAN DEFAULT FALSE;

-- Optional: Drop soulcodes table if desired or keep harmless
-- DROP TABLE IF EXISTS soulcodes CASCADE;
