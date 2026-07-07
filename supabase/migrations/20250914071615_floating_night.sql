/*
  # Add verification system

  1. New Tables
    - `user_verifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `verification_type` (text, e.g., 'fract_user', 'developer', 'organization')
      - `verification_reason` (text, description of why verified)
      - `verified_at` (timestamp)
      - `verified_by` (uuid, admin who verified)
      - `is_active` (boolean, can be revoked)

  2. Profile Updates
    - Add `is_verified` boolean column to profiles table
    - Add `verification_type` text column to profiles table

  3. Security
    - Enable RLS on user_verifications table
    - Add policies for viewing verification data
*/

-- Add verification columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_verified boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verification_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_type text DEFAULT null;
  END IF;
END $$;

-- Create user_verifications table
CREATE TABLE IF NOT EXISTS user_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verification_type text NOT NULL DEFAULT 'fract_user',
  verification_reason text NOT NULL,
  verified_at timestamptz DEFAULT now(),
  verified_by uuid REFERENCES profiles(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for user_verifications
CREATE POLICY "Anyone can view active verifications"
  ON user_verifications
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Only admins can manage verifications"
  ON user_verifications
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Create indexes
CREATE INDEX IF NOT EXISTS user_verifications_user_id_idx ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS user_verifications_type_idx ON user_verifications(verification_type);
CREATE INDEX IF NOT EXISTS user_verifications_active_idx ON user_verifications(is_active);

-- Create unique constraint to prevent duplicate active verifications
CREATE UNIQUE INDEX IF NOT EXISTS user_verifications_user_active_unique 
  ON user_verifications(user_id) 
  WHERE is_active = true;

-- Insert sample verification for demo (you can remove this later)
-- This will verify the first user that registers
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  -- Get the first user (if any exists)
  SELECT id INTO first_user_id FROM profiles LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    -- Update profile to be verified
    UPDATE profiles 
    SET is_verified = true, verification_type = 'fract_user'
    WHERE id = first_user_id;
    
    -- Insert verification record
    INSERT INTO user_verifications (user_id, verification_type, verification_reason)
    VALUES (
      first_user_id, 
      'fract_user', 
      'This account is verified because it represents a microblog app user.'
    )
    ON CONFLICT (user_id) WHERE is_active = true DO NOTHING;
  END IF;
END $$;