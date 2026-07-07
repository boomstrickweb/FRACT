/*
  # Scrub All Profile Recursion
  
  1. Problem
    - Persistent "infinite recursion detected in policy" error on profiles table updates.
    - Multiple historical policies might be active simultaneously due to RLS being additive.
    - Some policies use subqueries on profiles or blocked_users that lead back to profiles.
    
  2. Solution
    - Drop EVERY possible historical policy name on the profiles table.
    - Implement a clean, minimal set of non-recursive policies.
    - Rely on the BEFORE UPDATE trigger for field-level security.
*/

-- 1. Drop ALL known historical policy names on profiles
DO $$
BEGIN
  -- Select policies
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  DROP POLICY IF EXISTS "Public can read basic profile info" ON profiles;
  DROP POLICY IF EXISTS "Anyone can read basic profile info" ON profiles;
  DROP POLICY IF EXISTS "Anyone can read active profile info" ON profiles;
  DROP POLICY IF EXISTS "Anyone can read profile info" ON profiles;
  DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
  
  -- Update policies
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile (restricted)" ON profiles;
  
  -- Insert policies
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  
  -- Delete policies
  DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
END $$;

-- 2. Create clean, non-recursive policies

-- SELECT: Allow anyone to read profiles (simplified)
-- We avoid any subqueries here (like checking blocked_users) to prevent recursion
CREATE POLICY "profiles_select_policy"
  ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- UPDATE: Allow users to update their own profile
-- Field-level protection is handled by the trigger `trigger_protect_profile_fields`
CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: Allow users to insert their own profile
CREATE POLICY "profiles_insert_policy"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- DELETE: Allow users to delete their own profile
CREATE POLICY "profiles_delete_policy"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- 3. Ensure the trigger is robust and up-to-date
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Bypass for system/admin roles
  IF current_setting('role', true) IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  
  -- Bypass for admin functions with special marker
  IF current_setting('app.bypass_profile_protection', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  -- Prevent modification of system-managed or sensitive fields
  IF OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
    RAISE EXCEPTION 'Cannot modify is_verified field' USING ERRCODE = '42501';
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

-- Re-apply trigger to ensure it's active
DROP TRIGGER IF EXISTS trigger_protect_profile_fields ON profiles;
CREATE TRIGGER trigger_protect_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_fields();
