/*
  # Secure is_verified and Protected Fields from User Manipulation

  1. Security Changes
    - Drop existing "Users can update own profile" policy that allows unrestricted updates
    - Create new restrictive policy that prevents users from modifying protected fields:
      - is_verified (verification status - system/admin only)
      - verification_type (verification method - system/admin only)
      - verification_reason (verification details - system/admin only)
      - trust_score (reputation score - system/admin only)
      - password_hash (handled via auth system only)
  
  2. Impact
    - Regular users can still update their profile (name, bio, username, etc.)
    - Users CANNOT change is_verified, verification_type, verification_reason, trust_score, or password_hash
    - These fields can only be modified through admin functions or system operations
  
  3. Security Notes
    - This prevents privilege escalation where users set is_verified = true
    - Protected fields must remain unchanged in user updates (checked via WITH CHECK)
    - Any attempt to modify protected fields will fail the policy check
*/

-- Drop the existing unrestricted update policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new restrictive policy for regular users
-- This allows users to update their profile but BLOCKS changes to protected fields
CREATE POLICY "Users can update own profile (restricted)"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Ensure protected fields cannot be changed by users
    -- Using IS NOT DISTINCT FROM to handle NULL values correctly
    AND (is_verified IS NOT DISTINCT FROM (SELECT is_verified FROM profiles WHERE id = auth.uid()))
    AND (verification_type IS NOT DISTINCT FROM (SELECT verification_type FROM profiles WHERE id = auth.uid()))
    AND (verification_reason IS NOT DISTINCT FROM (SELECT verification_reason FROM profiles WHERE id = auth.uid()))
    AND (trust_score IS NOT DISTINCT FROM (SELECT trust_score FROM profiles WHERE id = auth.uid()))
    AND (password_hash IS NOT DISTINCT FROM (SELECT password_hash FROM profiles WHERE id = auth.uid()))
  );