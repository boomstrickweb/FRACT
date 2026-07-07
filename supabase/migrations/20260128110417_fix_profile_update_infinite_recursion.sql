/*
  # Fix Profile Update Infinite Recursion

  1. Problem
    - The WITH CHECK clause in "Users can update own profile (restricted)" policy
    - Queries profiles table: SELECT ... FROM profiles WHERE id = auth.uid()
    - This creates infinite recursion when updating profiles
    
  2. Solution
    - Replace policy WITH CHECK with a BEFORE UPDATE trigger
    - Trigger checks if protected fields are being modified
    - Blocks update if protected fields changed
    - No RLS recursion since trigger runs before RLS checks
    
  3. Protected Fields
    - is_verified
    - verification_type
    - verification_reason
    - trust_score
    - password_hash
    
  4. Security
    - Users can update all other profile fields
    - Protected fields can only change via admin functions
    - Clear error messages when blocked
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can update own profile (restricted)" ON profiles;

-- Create simple update policy without recursive SELECT
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create trigger function to protect specific fields
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if this is a system/admin operation (bypass protection)
  -- System operations don't have a current user context
  IF current_setting('role', true) = 'postgres' OR current_setting('role', true) = 'supabase_admin' THEN
    RETURN NEW;
  END IF;
  
  -- Allow admin functions to update protected fields
  -- (They use SECURITY DEFINER and set a special marker)
  IF current_setting('app.bypass_profile_protection', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  -- Check if protected fields are being modified
  IF OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
    RAISE EXCEPTION 'Cannot modify is_verified field'
      USING HINT = 'This field can only be modified by administrators',
            ERRCODE = '42501';
  END IF;
  
  IF OLD.verification_type IS DISTINCT FROM NEW.verification_type THEN
    RAISE EXCEPTION 'Cannot modify verification_type field'
      USING HINT = 'This field can only be modified by administrators',
            ERRCODE = '42501';
  END IF;
  
  IF OLD.verification_reason IS DISTINCT FROM NEW.verification_reason THEN
    RAISE EXCEPTION 'Cannot modify verification_reason field'
      USING HINT = 'This field can only be modified by administrators',
            ERRCODE = '42501';
  END IF;
  
  IF OLD.trust_score IS DISTINCT FROM NEW.trust_score THEN
    RAISE EXCEPTION 'Cannot modify trust_score field'
      USING HINT = 'This field can only be modified by administrators',
            ERRCODE = '42501';
  END IF;
  
  IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
    RAISE EXCEPTION 'Cannot modify password_hash field'
      USING HINT = 'Use the authentication system to change passwords',
            ERRCODE = '42501';
  END IF;
  
  -- All checks passed, allow the update
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_protect_profile_fields ON profiles;

CREATE TRIGGER trigger_protect_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_fields();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION protect_profile_fields() TO authenticated;