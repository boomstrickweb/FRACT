/*
  # Final Fix for Profile Update Infinite Recursion
  
  1. Problem
    - Recursive RLS policies on the `profiles` table cause infinite loops during updates.
    - Specifically, "Users can update own profile (restricted)" uses subqueries on `profiles`.
    
  2. Solution
    - Drop all recursive policies.
    - Use a simple update policy: `USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`.
    - Rely on the `protect_profile_fields` BEFORE UPDATE trigger for field-level protection.
    - This trigger runs before RLS and doesn't cause recursion.
*/

-- 1. Drop problematic recursive policies
DROP POLICY IF EXISTS "Users can update own profile (restricted)" ON profiles;

-- 2. Ensure a clean, non-recursive update policy exists
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Update the trigger function to protect all sensitive fields
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

-- 4. Re-apply the trigger
DROP TRIGGER IF EXISTS trigger_protect_profile_fields ON profiles;
CREATE TRIGGER trigger_protect_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_fields();

-- 5. Update the SELECT policy to be more robust
DROP POLICY IF EXISTS "Anyone can read profile info" ON profiles;
CREATE POLICY "Anyone can read profile info" ON profiles
  FOR SELECT 
  TO anon, authenticated 
  USING (
    (is_deactivated = false) OR 
    (is_deactivated IS NULL) OR 
    (auth.uid() = id)
  );

-- Note: The blocking logic is better handled in application queries or specialized views
-- to avoid RLS overhead and recursion risks in complex policies.
