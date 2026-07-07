/*
  # Remove Overly Permissive Anti-Spam Policies

  1. Issue
    - "System manages" policies allow any authenticated user to modify anti-spam data
    - This creates potential for infinite recursion and security issues
    
  2. Fix
    - Remove the overly permissive policies
    - Keep read-only policies for users
    - All modifications handled by SECURITY DEFINER functions
    
  3. Security
    - Users can only read their own anti-spam data
    - No direct writes allowed from client
    - Functions use SECURITY DEFINER to bypass RLS when needed
*/

-- Drop overly permissive policies that allow all operations
DROP POLICY IF EXISTS "System manages rate limits" ON post_rate_limits;
DROP POLICY IF EXISTS "System manages fingerprints" ON post_fingerprints;
DROP POLICY IF EXISTS "System manages violations" ON spam_violations;

-- The read-only policies already exist and are correct:
-- "Users can view own rate limits" - SELECT only
-- "Users can view own fingerprints" - SELECT only  
-- "Users can view own violations" - SELECT only

-- Ensure functions have proper permissions
GRANT EXECUTE ON FUNCTION generate_content_fingerprint(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_duplicate_post(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_post_cooldown(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_post_rate_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION record_post_attempt(uuid, uuid, text) TO authenticated;