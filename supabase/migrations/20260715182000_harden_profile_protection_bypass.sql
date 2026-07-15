-- FIX: Robust bypass for profile protection
-- This migration ensures that the Supabase Dashboard and other administrative tools
-- can modify protected fields by checking both session role and auth role.

CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _current_role text;
  _auth_role text;
  _current_user text;
  _session_user text;
BEGIN
  -- Capture all identity markers
  _current_role := current_setting('role', true);
  _current_user := current_user;
  _session_user := session_user;
  
  -- Get auth role from JWT if available
  BEGIN
    _auth_role := auth.role();
  EXCEPTION WHEN OTHERS THEN
    _auth_role := NULL;
  END;

  -- 1. Check for system roles in session
  IF _current_role IN ('postgres', 'supabase_admin', 'service_role', 'authenticator') THEN
    RETURN NEW;
  END IF;

  -- 2. Check for system users
  IF _current_user IN ('postgres', 'supabase_admin', 'service_role') OR 
     _session_user IN ('postgres', 'supabase_admin', 'service_role') 
  THEN
    RETURN NEW;
  END IF;

  -- 3. Check for service_role in auth context (Supabase API/Dashboard)
  IF _auth_role = 'service_role' THEN
    RETURN NEW;
  END IF;
  
  -- 4. Bypass for admin functions with special marker
  IF current_setting('app.bypass_profile_protection', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  -- Prevent modification of system-managed fields for regular users
  IF OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
    RAISE EXCEPTION 'Cannot modify is_verified field (Identities -> Role: %, AuthRole: %, User: %, SessUser: %)', 
      _current_role, 
      COALESCE(_auth_role, (CASE WHEN current_setting('request.jwt.claims', true) IS NOT NULL THEN (current_setting('request.jwt.claims', true)::jsonb->>'role') ELSE 'none' END)),
      _current_user,
      _session_user
      USING ERRCODE = '42501';
  END IF;
  
  IF OLD.verification_type IS DISTINCT FROM NEW.verification_type THEN
    RAISE EXCEPTION 'Cannot modify verification_type field' USING ERRCODE = '42501';
  END IF;
  
  IF OLD.verification_reason IS DISTINCT FROM NEW.verification_reason THEN
    RAISE EXCEPTION 'Cannot modify verification_reason field' USING ERRCODE = '42501';
  END IF;
  
  IF OLD.trust_score IS DISTINCT FROM NEW.trust_score THEN
    RAISE EXCEPTION 'Cannot modify trust_score field' USING ERRCODE = '42501';
  END IF;
  
  IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
    RAISE EXCEPTION 'Cannot modify password_hash field' USING ERRCODE = '42501';
  END IF;

  -- Protect action password fields
  IF OLD.action_password_hash IS DISTINCT FROM NEW.action_password_hash THEN
    RAISE EXCEPTION 'Cannot modify action_password_hash field' USING ERRCODE = '42501';
  END IF;

  IF OLD.action_password_settings IS DISTINCT FROM NEW.action_password_settings THEN
    RAISE EXCEPTION 'Cannot modify action_password_settings field' USING ERRCODE = '42501';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger is active and using the LATEST version of the function
DROP TRIGGER IF EXISTS trigger_protect_profile_fields ON profiles;
CREATE TRIGGER trigger_protect_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_fields();

-- Also ensure any other potential triggers with different names are removed to avoid conflict
DROP TRIGGER IF EXISTS protect_profile_fields_trigger ON profiles;
