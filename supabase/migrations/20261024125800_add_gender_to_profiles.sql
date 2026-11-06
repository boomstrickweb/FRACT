-- Add gender column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text;
