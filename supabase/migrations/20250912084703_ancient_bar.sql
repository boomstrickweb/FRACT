/*
  # Create notification count function

  1. New Functions
    - `get_unread_notification_count` - Returns count of unread notifications for a user
  
  2. Security
    - Function is accessible to authenticated users
    - Only counts notifications for the specified user
*/

CREATE OR REPLACE FUNCTION public.get_unread_notification_count(user_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM public.notifications
  WHERE user_id = user_uuid AND is_read = FALSE;

  RETURN unread_count;
END;
$$;