/*
  # Remove notifications and make app completely private

  1. Changes
    - Drop all notification-related functions and triggers
    - Remove notification system completely
    - Make followers completely private (users can't see who follows them)
    - Remove all notification features

  2. Security
    - No notifications for any activities
    - Complete privacy for all user interactions
    - Users only see who they follow, not who follows them
*/

-- Drop all notification triggers
DROP TRIGGER IF EXISTS notify_new_follower_trigger ON follows;
DROP TRIGGER IF EXISTS notify_followers_new_post_trigger ON posts;

-- Drop all notification functions
DROP FUNCTION IF EXISTS notify_new_follower();
DROP FUNCTION IF EXISTS notify_followers_new_post();
DROP FUNCTION IF EXISTS get_unread_notification_count(uuid);

-- Clear all existing notifications
DELETE FROM notifications;

-- Update RLS policies to make followers completely private
-- Users can only see who they follow, never who follows them
DROP POLICY IF EXISTS "Users can view non-blocked follows" ON follows;

CREATE POLICY "Users can only see who they follow"
  ON follows
  FOR SELECT
  TO authenticated
  USING (follower_id = auth.uid());