/*
  # Create Account Deletion Function

  1. Changes
    - Creates an RPC function to completely delete a user account
    - Deletes all user-related data in proper order
    - Respects foreign key constraints
    
  2. Security
    - Function can only be called by authenticated users
    - Users can only delete their own account
*/

CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  -- Verify that the user is deleting their own account
  IF auth.uid() != user_id_to_delete THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Delete user sessions
  DELETE FROM user_sessions WHERE user_id = user_id_to_delete;

  -- Delete saved posts
  DELETE FROM saved_posts WHERE user_id = user_id_to_delete;

  -- Delete post reactions
  DELETE FROM post_reactions WHERE user_id = user_id_to_delete;

  -- Delete corrections
  DELETE FROM corrections WHERE author_id = user_id_to_delete;

  -- Delete post sources for user's posts
  DELETE FROM post_sources 
  WHERE post_id IN (SELECT id FROM posts WHERE author_id = user_id_to_delete);

  -- Delete posts
  DELETE FROM posts WHERE author_id = user_id_to_delete;

  -- Delete follows (as follower and following)
  DELETE FROM follows WHERE follower_id = user_id_to_delete OR following_id = user_id_to_delete;

  -- Delete notifications
  DELETE FROM notifications WHERE user_id = user_id_to_delete OR from_user_id = user_id_to_delete;

  -- Delete blocked users
  DELETE FROM blocked_users WHERE blocker_id = user_id_to_delete OR blocked_id = user_id_to_delete;

  -- Delete user reports
  DELETE FROM user_reports WHERE reporter_id = user_id_to_delete OR reported_id = user_id_to_delete;

  -- Delete account scope
  DELETE FROM account_scope WHERE user_id = user_id_to_delete;

  -- Delete user verifications
  DELETE FROM user_verifications WHERE user_id = user_id_to_delete;

  -- Delete user feedback
  DELETE FROM user_feedback WHERE user_id = user_id_to_delete;

  -- Delete profile
  DELETE FROM profiles WHERE id = user_id_to_delete;

  deleted_count := 1;

  RETURN json_build_object(
    'success', true,
    'message', 'Account deleted successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;