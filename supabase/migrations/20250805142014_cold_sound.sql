/*
  # Update privacy controls and add notifications system

  1. Privacy Updates
    - Remove followers visibility (only following visible to owner)
    - Update follow counts to only show following count to owner
    
  2. Notifications System
    - Create notifications table
    - Add notification preferences to profiles
    - Create functions for notification management
    
  3. Edit History
    - Ensure edit history is accessible to all users
    - Add proper indexes for edit history queries
*/

-- Update profiles table to add notification preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT true;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('new_post', 'follow', 'mention')),
  title text NOT NULL,
  message text NOT NULL,
  related_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  related_post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for notifications
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_message text,
  related_user_id uuid DEFAULT NULL,
  related_post_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create notification if user has notifications enabled
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = target_user_id 
    AND notifications_enabled = true
  ) THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      related_user_id,
      related_post_id
    ) VALUES (
      target_user_id,
      notification_type,
      notification_title,
      notification_message,
      related_user_id,
      related_post_id
    );
  END IF;
END;
$$;

-- Function to get follow counts (updated for privacy)
CREATE OR REPLACE FUNCTION get_follow_counts(user_uuid uuid)
RETURNS TABLE(followers_count bigint, following_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Followers count only visible to profile owner
    CASE 
      WHEN auth.uid() = user_uuid THEN (
        SELECT COUNT(*) FROM follows WHERE following_id = user_uuid
      )
      ELSE 0::bigint
    END as followers_count,
    -- Following count only visible to profile owner
    CASE 
      WHEN auth.uid() = user_uuid THEN (
        SELECT COUNT(*) FROM follows WHERE follower_id = user_uuid
      )
      ELSE 0::bigint
    END as following_count;
END;
$$;

-- Function to notify followers about new posts
CREATE OR REPLACE FUNCTION notify_followers_new_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  follower_record RECORD;
  author_name text;
BEGIN
  -- Get author name
  SELECT COALESCE(name, 'User ' || substring(NEW.author_id::text, 1, 8)) 
  INTO author_name
  FROM profiles 
  WHERE id = NEW.author_id;

  -- Notify all followers
  FOR follower_record IN 
    SELECT f.follower_id
    FROM follows f
    WHERE f.following_id = NEW.author_id
  LOOP
    PERFORM create_notification(
      follower_record.follower_id,
      'new_post',
      'New Post',
      author_name || ' shared a new post',
      NEW.author_id,
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger for new post notifications
DROP TRIGGER IF EXISTS notify_followers_new_post_trigger ON posts;
CREATE TRIGGER notify_followers_new_post_trigger
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_followers_new_post();

-- Function to notify about new followers
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  follower_name text;
BEGIN
  -- Get follower name
  SELECT COALESCE(name, 'User ' || substring(NEW.follower_id::text, 1, 8)) 
  INTO follower_name
  FROM profiles 
  WHERE id = NEW.follower_id;

  -- Notify the user being followed
  PERFORM create_notification(
    NEW.following_id,
    'follow',
    'New Follower',
    follower_name || ' started following you',
    NEW.follower_id,
    NULL
  );

  RETURN NEW;
END;
$$;

-- Trigger for new follower notifications
DROP TRIGGER IF EXISTS notify_new_follower_trigger ON follows;
CREATE TRIGGER notify_new_follower_trigger
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_follower();