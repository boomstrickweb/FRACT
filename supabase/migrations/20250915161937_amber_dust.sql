/*
  # Add missing is_user_blocked function

  1. Functions
    - `is_user_blocked(blocked_uuid, blocker_uuid)` - Check if a user is blocked by another user
  
  2. Security
    - Function is accessible to authenticated users
    - Returns boolean indicating block status
*/

CREATE OR REPLACE FUNCTION public.is_user_blocked(blocked_uuid uuid, blocker_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if blocker_uuid has blocked blocked_uuid
  RETURN EXISTS (
    SELECT 1
    FROM public.blocked_users
    WHERE blocker_id = blocker_uuid AND blocked_id = blocked_uuid
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_blocked(uuid, uuid) TO authenticated;