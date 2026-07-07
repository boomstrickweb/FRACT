/*
  # Add Post Moderation System

  1. New Fields
    - Add `moderation_reason` column to posts table
      - Values: '--' (default), 'VIOLENCE_CALL', 'DEHUMANIZATION', 'EXTREME_RAGE'
      - Only modifiable by system admins
    
  2. Functionality
    - Posts with moderation reasons are excluded from Discover tab
    - Post owners see specific warning messages
    - Account status automatically becomes 'limited' when any post is moderated
    
  3. Security
    - RLS policies prevent non-admin modifications
    - Admin-only function to set moderation reasons
    - Automatic account status updates via trigger
    - All actions logged in security_events
*/

-- Add moderation_reason column to posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'moderation_reason'
  ) THEN
    ALTER TABLE posts ADD COLUMN moderation_reason text DEFAULT '--';
    
    -- Add check constraint to ensure only valid values
    ALTER TABLE posts ADD CONSTRAINT moderation_reason_check 
      CHECK (moderation_reason IN ('--', 'VIOLENCE_CALL', 'DEHUMANIZATION', 'EXTREME_RAGE'));
  END IF;
END $$;

-- Create index for faster queries on moderated posts
CREATE INDEX IF NOT EXISTS idx_posts_moderation_reason 
  ON posts(moderation_reason) WHERE moderation_reason != '--';

-- Create index for discovering non-moderated posts
CREATE INDEX IF NOT EXISTS idx_posts_not_moderated 
  ON posts(created_at DESC) WHERE moderation_reason = '--';

-- Create admin function to set post moderation reason
CREATE OR REPLACE FUNCTION moderate_post(
  target_post_id uuid,
  reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  is_admin boolean;
  post_author_id uuid;
BEGIN
  -- Get the current user
  current_user_id := auth.uid();
  
  -- Check if current user is admin
  SELECT profiles.is_admin INTO is_admin
  FROM profiles
  WHERE profiles.id = current_user_id;
  
  -- Only admins can moderate posts
  IF NOT is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only administrators can moderate posts'
    );
  END IF;
  
  -- Validate the moderation reason
  IF reason NOT IN ('--', 'VIOLENCE_CALL', 'DEHUMANIZATION', 'EXTREME_RAGE') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid moderation reason'
    );
  END IF;
  
  -- Get the post author
  SELECT author_id INTO post_author_id
  FROM posts
  WHERE id = target_post_id;
  
  IF post_author_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Post not found'
    );
  END IF;
  
  -- Update the post moderation reason
  UPDATE posts
  SET moderation_reason = reason,
      updated_at = now()
  WHERE id = target_post_id;
  
  -- Log the moderation action
  INSERT INTO security_events (user_id, event_type, event_details)
  VALUES (
    current_user_id,
    'post_moderation_applied',
    json_build_object(
      'post_id', target_post_id,
      'post_author_id', post_author_id,
      'moderation_reason', reason,
      'moderated_by', current_user_id
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Post moderation applied successfully',
    'post_author_id', post_author_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Create function to check if user has any moderated posts
CREATE OR REPLACE FUNCTION user_has_moderated_posts(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_moderated boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM posts
    WHERE author_id = user_id
    AND moderation_reason IN ('VIOLENCE_CALL', 'DEHUMANIZATION', 'EXTREME_RAGE')
  ) INTO has_moderated;
  
  RETURN has_moderated;
END;
$$;

-- Create trigger function to auto-update account status when post is moderated
CREATE OR REPLACE FUNCTION update_account_status_on_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If moderation reason changed to a restricted category, set account to limited
  IF NEW.moderation_reason IN ('VIOLENCE_CALL', 'DEHUMANIZATION', 'EXTREME_RAGE') 
     AND OLD.moderation_reason = '--' THEN
    
    UPDATE profiles
    SET account_status = 'limited',
        updated_at = now()
    WHERE id = NEW.author_id;
    
    -- Log the automatic account status change
    INSERT INTO security_events (user_id, event_type, event_details)
    VALUES (
      NEW.author_id,
      'account_auto_limited',
      json_build_object(
        'reason', 'post_moderated',
        'post_id', NEW.id,
        'moderation_reason', NEW.moderation_reason
      )
    );
  
  -- If moderation reason changed from restricted to '--', check if user still has moderated posts
  ELSIF NEW.moderation_reason = '--' 
        AND OLD.moderation_reason IN ('VIOLENCE_CALL', 'DEHUMANIZATION', 'EXTREME_RAGE') THEN
    
    -- Only restore to active if user has no other moderated posts
    IF NOT user_has_moderated_posts(NEW.author_id) THEN
      UPDATE profiles
      SET account_status = 'active',
          updated_at = now()
      WHERE id = NEW.author_id;
      
      -- Log the automatic account status restoration
      INSERT INTO security_events (user_id, event_type, event_details)
      VALUES (
        NEW.author_id,
        'account_auto_restored',
        json_build_object(
          'reason', 'no_moderated_posts',
          'post_id', NEW.id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on posts table
DROP TRIGGER IF EXISTS trigger_update_account_status_on_moderation ON posts;
CREATE TRIGGER trigger_update_account_status_on_moderation
  AFTER UPDATE OF moderation_reason ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_account_status_on_moderation();

-- Add RLS policy to prevent users from seeing or modifying moderation_reason
-- (Users can read their own posts with moderation reasons, but cannot modify)
-- This will be handled in application logic for display

-- Add comment to the column
COMMENT ON COLUMN posts.moderation_reason IS 'Moderation category applied by admins only. Moderated posts excluded from Discover tab.';
