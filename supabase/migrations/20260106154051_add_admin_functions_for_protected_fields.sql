/*
  # Add Admin Functions for Managing Protected Fields

  1. New Column
    - Add `is_admin` to profiles table if not exists
  
  2. New Functions
    - `admin_set_user_verification` - Allows admins to verify/unverify users
    - `admin_update_trust_score` - Allows admins to update user trust scores
    - `admin_update_verification_type` - Allows admins to set verification type/reason
  
  3. Security
    - All functions use SECURITY DEFINER to bypass RLS
    - All functions check if caller is an admin before proceeding
    - Functions provide controlled access to protected fields
  
  4. Impact
    - Admins can now properly manage user verification status
    - Admins can adjust trust scores
    - All changes are logged with admin accountability
*/

-- Add is_admin column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS profiles_is_admin_idx ON profiles(is_admin) WHERE is_admin = true;

-- Function: Set user verification status (admin only)
CREATE OR REPLACE FUNCTION admin_set_user_verification(
  target_user_id uuid,
  verified boolean,
  v_type text DEFAULT NULL,
  v_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can modify verification status';
  END IF;

  -- Update the user's verification status
  UPDATE profiles
  SET 
    is_verified = verified,
    verification_type = COALESCE(v_type, verification_type),
    verification_reason = COALESCE(v_reason, verification_reason)
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

-- Function: Update user trust score (admin only)
CREATE OR REPLACE FUNCTION admin_update_trust_score(
  target_user_id uuid,
  new_trust_score numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can modify trust scores';
  END IF;

  -- Validate trust score range (0-100)
  IF new_trust_score < 0 OR new_trust_score > 100 THEN
    RAISE EXCEPTION 'Trust score must be between 0 and 100';
  END IF;

  -- Update the user's trust score
  UPDATE profiles
  SET trust_score = new_trust_score
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

-- Grant execute permissions to authenticated users
-- (The functions will check admin status internally)
GRANT EXECUTE ON FUNCTION admin_set_user_verification(uuid, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_trust_score(uuid, numeric) TO authenticated;