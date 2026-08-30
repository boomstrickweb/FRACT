-- Add Bluesky columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bluesky_handle TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bluesky_did TEXT;
