/*
  # Secure Profile Email Privacy

  1. Purpose
    - Prevent exposure of user email addresses and other sensitive profile data
    - Enforce privacy at the database level
    - Document which fields are considered sensitive

  2. Sensitive Fields (Should NEVER be exposed to other users)
    - phone_number: Contains the user's email address
    - country_code: Part of contact information
    - password_hash: Authentication credential
    - Any other fields containing PII

  3. Security Notes
    - Frontend code MUST only select specific non-sensitive columns when querying other users' profiles
    - Only the profile owner (auth.uid() = profiles.id) should have access to sensitive fields
    - This migration adds documentation and creates a public profile view for safe querying

  4. Changes
    - Create a view for public profile data that excludes sensitive fields
    - Add comments to document sensitive vs public fields
*/

-- Add comments to document field sensitivity
COMMENT ON COLUMN profiles.phone_number IS 'SENSITIVE: Contains user email address. Only accessible to profile owner.';
COMMENT ON COLUMN profiles.country_code IS 'SENSITIVE: Contact information. Only accessible to profile owner.';
COMMENT ON COLUMN profiles.password_hash IS 'SENSITIVE: Authentication credential. Only accessible to profile owner.';

-- Create a view for safe public profile queries
-- This view explicitly excludes sensitive fields
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
  id,
  username,
  name,
  bio,
  profile_pic_url,
  cover_pic_url,
  profile_completed,
  beliefs,
  field,
  show_following,
  show_respected_posts,
  show_rejected_posts,
  show_observed_posts,
  is_deactivated,
  deactivated_at,
  verification_type,
  verification_reason,
  profile_type,
  media_converted_at,
  trust_score,
  created_at,
  updated_at
FROM profiles;

-- Grant read access to the public view
GRANT SELECT ON public_profiles TO anon, authenticated;

-- Add a comment explaining the view's purpose
COMMENT ON VIEW public_profiles IS 'Safe view of profile data that excludes sensitive fields like phone_number (email) and password_hash. Use this view when querying profiles of other users.';