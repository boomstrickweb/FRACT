/*
  # Complete User Deletion Function

  1. Function
    - `delete_user_completely` - Deletes all user data in correct order
    
  2. Security
    - Only authenticated users can delete their own data
    - Handles all foreign key constraints properly
*/

CREATE OR REPLACE FUNCTION delete_user_completely(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Only allow users to delete their own data
  IF auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Access denied: can only delete own account';
  END IF;

  -- Delete in correct order to respect foreign key constraints
  
  -- 1. Delete notifications
  DELETE FROM notifications WHERE user_id = user_uuid OR related_user_id = user_uuid;
  
  -- 2. Delete post reactions
  DELETE FROM post_reactions WHERE user_id = user_uuid;
  
  -- 3. Delete saved posts
  DELETE FROM saved_posts WHERE user_id = user_uuid;
  
  -- 4. Delete reposts
  DELETE FROM reposts WHERE user_id = user_uuid;
  
  -- 5. Delete post views
  DELETE FROM post_views WHERE user_id = user_uuid;
  
  -- 6. Delete post edit history for user's posts
  DELETE FROM post_edit_history WHERE post_id IN (
    SELECT id FROM posts WHERE author_id = user_uuid
  );
  
  -- 7. Delete posts
  DELETE FROM posts WHERE author_id = user_uuid;
  
  -- 8. Delete follows (both directions)
  DELETE FROM follows WHERE follower_id = user_uuid OR following_id = user_uuid;
  
  -- 9. Delete blocked users relationships
  DELETE FROM blocked_users WHERE blocker_id = user_uuid OR blocked_id = user_uuid;
  
  -- 10. Delete muted words
  DELETE FROM muted_words WHERE user_id = user_uuid;
  
  -- 11. Delete user sessions
  DELETE FROM user_sessions WHERE user_id = user_uuid;
  
  -- 12. Delete user reports
  DELETE FROM user_reports WHERE reporter_id = user_uuid OR reported_id = user_uuid;
  
  -- 13. Delete user verifications
  DELETE FROM user_verifications WHERE user_id = user_uuid;
  
  -- 14. Delete phone verifications for this user's phone
  DELETE FROM phone_verifications WHERE phone_number IN (
    SELECT phone_number FROM profiles WHERE id = user_uuid
  );
  
  -- 15. Finally delete the profile
  DELETE FROM profiles WHERE id = user_uuid;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;