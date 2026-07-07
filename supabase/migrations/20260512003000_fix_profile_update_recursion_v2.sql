/*
  # Fix Profile Update Infinite Recursion (Again)
  
  1. Problem
    - Migration 20260511122700 reintroduced a recursive policy "Users can update own profile (restricted)"
    - This policy uses SELECT on profiles table within WITH CHECK, causing infinite recursion
    
  2. Solution
    - Drop the problematic policy
    - Ensure the simple "Users can update own profile" policy exists
    - Update the protect_profile_fields trigger function to include action password fields
*/

-- 1. Drop the problematic policy
DROP POLICY IF EXISTS "Users can update own profile (restricted)" ON profiles;

-- 2. Ensure simple update policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 3. Update the trigger function to protect additional fields
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if this is a system/admin operation (bypass protection)
  IF current_setting('role', true) = 'postgres' OR current_setting('role', true) = 'supabase_admin' THEN
    RETURN NEW;
  END IF;
  
  -- Allow admin functions to update protected fields
  IF current_setting('app.bypass_profile_protection', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  -- Original protected fields
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

  -- NEW: Protected action password fields
  IF OLD.action_password_hash IS DISTINCT FROM NEW.action_password_hash THEN
    RAISE EXCEPTION 'Cannot modify action_password_hash field'
      USING HINT = 'This field can only be modified via secure edge functions',
            ERRCODE = '42501';
  END IF;

  IF OLD.action_password_settings IS DISTINCT FROM NEW.action_password_settings THEN
    RAISE EXCEPTION 'Cannot modify action_password_settings field'
      USING HINT = 'This field can only be modified via secure edge functions',
            ERRCODE = '42501';
  END IF;
  
  -- All checks passed, allow the update
  RETURN NEW;
END;
$$;
