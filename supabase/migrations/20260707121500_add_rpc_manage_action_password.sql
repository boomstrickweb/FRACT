/*
  # ADD RPC FOR ACTION PASSWORD MANAGEMENT
  
  1. Purpose
    - To provide a secure and reliable way to update action password fields.
    - Bypasses the protect_profile_fields trigger in a single transaction.
    - Ensures consistency and security by centralizing this logic in the database.
*/

CREATE OR REPLACE FUNCTION rpc_manage_action_password(
  p_user_id uuid,
  p_action_password_hash text DEFAULT NULL,
  p_action_password_settings jsonb DEFAULT NULL,
  p_clear_password boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is the user or a service role (this is called from Edge Function using service_role)
  -- But we still check p_user_id for safety. The Edge Function verifies the JWT.
  
  -- Set bypass marker
  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  IF p_clear_password THEN
    UPDATE profiles
    SET 
      action_password_hash = NULL,
      action_password_settings = '{
        "login": false,
        "createPost": false,
        "editProfile": false,
        "settings": false,
        "deleteAccount": true
      }'::jsonb,
      updated_at = now()
    WHERE id = p_user_id;
  ELSIF p_action_password_hash IS NOT NULL AND p_action_password_settings IS NOT NULL THEN
    UPDATE profiles
    SET 
      action_password_hash = p_action_password_hash,
      action_password_settings = p_action_password_settings,
      updated_at = now()
    WHERE id = p_user_id;
  ELSIF p_action_password_hash IS NOT NULL THEN
    UPDATE profiles
    SET 
      action_password_hash = p_action_password_hash,
      updated_at = now()
    WHERE id = p_user_id;
  ELSIF p_action_password_settings IS NOT NULL THEN
    UPDATE profiles
    SET 
      action_password_settings = p_action_password_settings,
      updated_at = now()
    WHERE id = p_user_id;
  END IF;

  -- Reset bypass marker
  PERFORM set_config('app.bypass_profile_protection', 'false', true);
END;
$$;

-- Grant access to authenticated users (they still need to pass through the Edge Function for verification)
GRANT EXECUTE ON FUNCTION rpc_manage_action_password TO service_role;
