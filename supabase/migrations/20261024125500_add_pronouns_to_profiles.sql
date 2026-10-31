-- Add pronouns column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pronouns text;
