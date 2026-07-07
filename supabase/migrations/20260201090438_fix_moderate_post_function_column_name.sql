/*
  # Fix moderate_post function to use correct column name

  ## Changes
  - Update moderate_post function to use `event_details` instead of `details`
  - Ensures compatibility with existing security_events table schema
*/

CREATE OR REPLACE FUNCTION moderate_post(
  target_post_id uuid,
  reason moderation_category
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  post_author_id uuid;
  is_admin boolean;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: No active session'
    );
  END IF;

  SELECT profiles.is_admin INTO is_admin
  FROM profiles
  WHERE profiles.id = current_user_id;

  IF NOT COALESCE(is_admin, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin privileges required'
    );
  END IF;

  SELECT author_id INTO post_author_id
  FROM posts
  WHERE id = target_post_id;

  IF post_author_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Post not found'
    );
  END IF;

  UPDATE posts
  SET moderation_reason = reason,
      updated_at = now()
  WHERE id = target_post_id;

  INSERT INTO security_events (
    event_type,
    user_id,
    event_details,
    ip_address
  ) VALUES (
    'post_moderated',
    post_author_id,
    jsonb_build_object(
      'post_id', target_post_id,
      'moderation_reason', reason::text,
      'moderated_by', current_user_id
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Post moderation applied successfully',
    'post_author_id', post_author_id
  );
END;
$$;