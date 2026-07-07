/*
  # Update Moderation Categories

  ## Changes
  1. Update `moderation_category` ENUM type to include new values and remove old ones.
    - New values: 'NONE', 'child_exploitation', 'child_safety', 'self_harm_intent', 'bullying', 'violent_description', 'drugs', 'self_harm', 'hate', 'spam', 'violence', 'weapons'
    - Removed values: 'VIOLENCE_CALL', 'DEHUMANIZATION', 'EXTREME_RAGE'
  
  2. Migrate existing data:
    - Map 'VIOLENCE_CALL' to 'violence'
    - Map 'DEHUMANIZATION' to 'hate'
    - Map 'EXTREME_RAGE' to 'violence'
*/

-- Create a temporary type with the new values
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_category_new') THEN
        CREATE TYPE moderation_category_new AS ENUM (
            'NONE',
            'child_exploitation',
            'child_safety',
            'self_harm_intent',
            'bullying',
            'violent_description',
            'drugs',
            'self_harm',
            'hate',
            'spam',
            'violence',
            'weapons'
        );
    END IF;
END $$;

-- Drop trigger temporarily to avoid errors during migration
DROP TRIGGER IF EXISTS trigger_update_account_status_on_moderation ON posts;

-- Add a temporary column with the new type
ALTER TABLE posts ADD COLUMN moderation_reason_tmp moderation_category_new DEFAULT 'NONE';

-- Migrate existing data to the new type
UPDATE posts
SET moderation_reason_tmp = CASE moderation_reason::text
    WHEN 'VIOLENCE_CALL' THEN 'violence'::moderation_category_new
    WHEN 'DEHUMANIZATION' THEN 'hate'::moderation_category_new
    WHEN 'EXTREME_RAGE' THEN 'violence'::moderation_category_new
    WHEN 'NONE' THEN 'NONE'::moderation_category_new
    ELSE 'NONE'::moderation_category_new
END;

-- Drop the old column and the old type
ALTER TABLE posts DROP COLUMN moderation_reason;

-- Drop dependent functions before dropping the type
DROP FUNCTION IF EXISTS moderate_post(uuid, moderation_category);
DROP FUNCTION IF EXISTS update_account_status_on_moderation();

DROP TYPE moderation_category;

-- Rename the new type to the original name
ALTER TYPE moderation_category_new RENAME TO moderation_category;

-- Rename the temporary column to the original name
ALTER TABLE posts RENAME COLUMN moderation_reason_tmp TO moderation_reason;

-- Set NOT NULL and default
ALTER TABLE posts ALTER COLUMN moderation_reason SET NOT NULL;
ALTER TABLE posts ALTER COLUMN moderation_reason SET DEFAULT 'NONE'::moderation_category;

-- Recreate indexes
DROP INDEX IF EXISTS idx_posts_moderation_reason;
CREATE INDEX idx_posts_moderation_reason 
  ON posts(moderation_reason) WHERE moderation_reason != 'NONE';

DROP INDEX IF EXISTS idx_posts_discover_feed;
CREATE INDEX idx_posts_discover_feed 
  ON posts(created_at DESC) WHERE moderation_reason = 'NONE';

-- Update the moderate_post function to use the new ENUM values
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
    details,
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

-- Update the account status trigger function to use the new ENUM values
CREATE OR REPLACE FUNCTION update_account_status_on_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_moderated boolean;
BEGIN
  -- Check if moving from NONE to any moderation category
  IF NEW.moderation_reason != 'NONE' AND OLD.moderation_reason = 'NONE' THEN
    
    UPDATE profiles
    SET account_status = 'limited',
        updated_at = now()
    WHERE id = NEW.author_id;

    INSERT INTO security_events (
      event_type,
      user_id,
      details,
      ip_address
    ) VALUES (
      'account_status_changed',
      NEW.author_id,
      jsonb_build_object(
        'old_status', 'active',
        'new_status', 'limited',
        'reason', 'post_moderated',
        'moderation_reason', NEW.moderation_reason::text
      ),
      inet_client_addr()
    );

  -- Check if moving from any moderation category to NONE
  ELSIF NEW.moderation_reason = 'NONE' AND OLD.moderation_reason != 'NONE' THEN
    
    SELECT EXISTS (
      SELECT 1 FROM posts 
      WHERE author_id = NEW.author_id 
      AND id != NEW.id
      AND moderation_reason != 'NONE'
    ) INTO has_moderated;
    
    IF NOT has_moderated THEN
      UPDATE profiles
      SET account_status = 'active',
          updated_at = now()
      WHERE id = NEW.author_id;

      INSERT INTO security_events (
        event_type,
        user_id,
        details,
        ip_address
      ) VALUES (
        'account_status_changed',
        NEW.author_id,
        jsonb_build_object(
          'old_status', 'limited',
          'new_status', 'active',
          'reason', 'moderation_removed'
        ),
        inet_client_addr()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trigger_update_account_status_on_moderation
  AFTER UPDATE OF moderation_reason ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_account_status_on_moderation();

-- Update comment
COMMENT ON COLUMN posts.moderation_reason IS 'Moderation category (ENUM) applied by admins only. Values: NONE, child_exploitation, child_safety, self_harm_intent, bullying, violent_description, drugs, self_harm, hate, spam, violence, weapons. Moderated posts excluded from Discover tab.';
