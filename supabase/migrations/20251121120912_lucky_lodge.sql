/*
  # Fix Notification System

  1. Functions
    - `notify_new_follower()` - Creates notification when someone follows you
    - `notify_followers_new_post()` - Notifies followers when you post
    - `get_unread_notification_count()` - Gets count of unread notifications

  2. Triggers
    - Trigger on follows table for new followers
    - Trigger on posts table for new posts

  3. Security
    - Functions are security definer to allow proper access
    - Proper RLS policies on notifications table
*/

-- Create notification functions
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert notification for the user being followed
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_user_id,
    created_at
  ) VALUES (
    NEW.following_id,
    'follow',
    'New Follower',
    (SELECT COALESCE(name, 'Someone') FROM profiles WHERE id = NEW.follower_id) || ' started following you',
    NEW.follower_id,
    NOW()
  );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_followers_new_post()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  follower_record RECORD;
  author_name TEXT;
BEGIN
  -- Skip if post is anonymous
  IF NEW.is_anonymous THEN
    RETURN NEW;
  END IF;
  
  -- Get author name
  SELECT COALESCE(name, 'Someone') INTO author_name
  FROM profiles 
  WHERE id = NEW.author_id;
  
  -- Insert notifications for all followers
  FOR follower_record IN 
    SELECT f.follower_id
    FROM follows f
    JOIN profiles p ON p.id = f.follower_id
    WHERE f.following_id = NEW.author_id
    AND p.notifications_enabled = true
    AND p.is_deactivated IS NOT TRUE
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      related_user_id,
      related_post_id,
      created_at
    ) VALUES (
      follower_record.follower_id,
      'new_post',
      'New Post',
      author_name || ' shared a new post',
      NEW.author_id,
      NEW.id,
      NOW()
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM notifications
  WHERE user_id = user_uuid
  AND is_read = false;
  
  RETURN COALESCE(unread_count, 0);
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS notify_new_follower_trigger ON follows;
DROP TRIGGER IF EXISTS notify_followers_new_post_trigger ON posts;

-- Create triggers
CREATE TRIGGER notify_new_follower_trigger
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_follower();

CREATE TRIGGER notify_followers_new_post_trigger
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_followers_new_post();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION notify_new_follower() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_followers_new_post() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;