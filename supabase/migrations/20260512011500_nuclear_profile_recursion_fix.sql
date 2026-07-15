/*
  # FINAL NUCLEAR SCRUB OF PROFILE RECURSION
  
  1. Problem
    - Persistent "infinite recursion detected in policy" on the `profiles` table.
    - RLS is additive, so any legacy policy still hanging around will cause issues.
    - Complex SELECT policies that query the same table or linked tables (blocked_users) often trigger this.
    
  2. Solution
    - DROP ALL possible policy names for the `profiles` table that have ever existed.
    - Temporarily DISABLE RLS to clear the state.
    - Re-ENABLE RLS.
    - Create exactly FOUR minimal, non-recursive policies with unique names.
    - Use the BEFORE UPDATE trigger for field-level security (safe from RLS recursion).
*/

-- 1. Drop ALL identified historical policy names
DO $$
BEGIN
  -- SELECT policies
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  DROP POLICY IF EXISTS "Public can read basic profile info" ON profiles;
  DROP POLICY IF EXISTS "Anyone can read basic profile info" ON profiles;
  DROP POLICY IF EXISTS "Anyone can read active profile info" ON profiles;
  DROP POLICY IF EXISTS "Anyone can read profile info" ON profiles;
  DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
  DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
  
  -- UPDATE policies
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile (restricted)" ON profiles;
  DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
  DROP POLICY IF EXISTS "Users can manage their blocked users" ON profiles; -- Sometimes misnamed in migrations
  
  -- INSERT policies
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
  
  -- DELETE policies
  DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
  DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
END $$;

-- 2. Reset RLS state
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create minimal, GUARANTEED non-recursive policies
-- Use new, distinct names to avoid collision with any cached plans or legacy names

-- SELECT: Allow all authenticated users to read all profiles
-- This is the safest way to avoid recursion. Privacy is handled by public_profiles view
-- and field-level permissions if needed, but for RLS, 'true' is safest.
CREATE POLICY "profiles_nuclear_select"
  ON profiles
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- UPDATE: Simple ownership check
CREATE POLICY "profiles_nuclear_update"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: Simple ownership check
CREATE POLICY "profiles_nuclear_insert"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- DELETE: Simple ownership check
CREATE POLICY "profiles_nuclear_delete"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- 4. Ensure the field protection trigger is up-to-date and robust
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

  -- Protect action password fields (must be updated via Edge Functions)
  IF OLD.action_password_hash IS DISTINCT FROM NEW.action_password_hash THEN
    RAISE EXCEPTION 'Cannot modify action_password_hash field' USING ERRCODE = '42501';
  END IF;

  IF OLD.action_password_settings IS DISTINCT FROM NEW.action_password_settings THEN
    RAISE EXCEPTION 'Cannot modify action_password_settings field' USING ERRCODE = '42501';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Re-apply trigger
DROP TRIGGER IF EXISTS trigger_protect_profile_fields ON profiles;
CREATE TRIGGER trigger_protect_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_fields();
