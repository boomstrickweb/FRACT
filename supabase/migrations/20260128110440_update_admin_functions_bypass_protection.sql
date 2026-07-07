/*
  # Update Admin Functions to Bypass Profile Protection

  1. Changes
    - Update admin_set_user_verification to bypass trigger protection
    - Update admin_update_trust_score to bypass trigger protection
    - Set app.bypass_profile_protection = 'true' before updates
    
  2. Security
    - Only admin functions can set bypass marker
    - Functions still check admin status first
    - Protected fields can only be modified by admins
*/

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

  -- Set bypass marker for protected field trigger
  PERFORM set_config('app.bypass_profile_protection', 'true', true);

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
  
  -- Reset bypass marker
  PERFORM set_config('app.bypass_profile_protection', 'false', true);
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

  -- Set bypass marker for protected field trigger
  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  -- Update the user's trust score
  UPDATE profiles
  SET trust_score = new_trust_score
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Reset bypass marker
  PERFORM set_config('app.bypass_profile_protection', 'false', true);
END;
$$;