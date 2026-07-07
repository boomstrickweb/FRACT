/*
  # Convert moderation_reason to ENUM type

  ## Changes
  1. Create ENUM type for moderation_reason
    - Values: 'NONE', 'VIOLENCE_CALL', 'DEHUMANIZATION', 'EXTREME_RAGE'
  
  2. Convert posts.moderation_reason column
    - Drop trigger temporarily
    - Create temp ENUM column
    - Migrate data from text to ENUM
    - Drop old text column
    - Rename ENUM column
    - Recreate trigger

  ## Benefits
  - Database-level type safety
  - Better query performance with native type
  - Clear schema documentation
  - Prevents typos and invalid values
*/

-- Create ENUM type for moderation categories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_category') THEN
    CREATE TYPE moderation_category AS ENUM (
      'NONE',
      'VIOLENCE_CALL',
      'DEHUMANIZATION',
      'EXTREME_RAGE'
    );
  END IF;
END $$;

-- Drop trigger temporarily
DROP TRIGGER IF EXISTS trigger_update_account_status_on_moderation ON posts;

-- Drop constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'moderation_reason_check'
  ) THEN
    ALTER TABLE posts DROP CONSTRAINT moderation_reason_check;
  END IF;
END $$;

-- Update existing '--' values to 'NONE'
UPDATE posts SET moderation_reason = 'NONE' WHERE moderation_reason = '--';

-- Add new ENUM column
ALTER TABLE posts ADD COLUMN moderation_reason_new moderation_category;

-- Migrate data
UPDATE posts
SET moderation_reason_new = CASE moderation_reason
  WHEN 'NONE' THEN 'NONE'::moderation_category
  WHEN 'VIOLENCE_CALL' THEN 'VIOLENCE_CALL'::moderation_category
  WHEN 'DEHUMANIZATION' THEN 'DEHUMANIZATION'::moderation_category
  WHEN 'EXTREME_RAGE' THEN 'EXTREME_RAGE'::moderation_category
  ELSE 'NONE'::moderation_category
END;

-- Drop old column
ALTER TABLE posts DROP COLUMN moderation_reason;

-- Rename new column
ALTER TABLE posts RENAME COLUMN moderation_reason_new TO moderation_reason;

-- Set NOT NULL and default
ALTER TABLE posts ALTER COLUMN moderation_reason SET NOT NULL;
ALTER TABLE posts ALTER COLUMN moderation_reason SET DEFAULT 'NONE'::moderation_category;

-- Update indexes
DROP INDEX IF EXISTS idx_posts_moderation_reason;
CREATE INDEX idx_posts_moderation_reason 
  ON posts(moderation_reason) WHERE moderation_reason != 'NONE';

DROP INDEX IF EXISTS idx_posts_discover_feed;
CREATE INDEX idx_posts_discover_feed 
  ON posts(created_at DESC) WHERE moderation_reason = 'NONE';

-- Update the moderate_post function to use ENUM
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

-- Update the account status trigger function to use ENUM
CREATE OR REPLACE FUNCTION update_account_status_on_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_moderated boolean;
BEGIN
  IF NEW.moderation_reason IN ('VIOLENCE_CALL', 'DEHUMANIZATION', 'EXTREME_RAGE') 
     AND OLD.moderation_reason = 'NONE' THEN
    
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

  ELSIF NEW.moderation_reason = 'NONE' 
        AND OLD.moderation_reason IN ('VIOLENCE_CALL', 'DEHUMANIZATION', 'EXTREME_RAGE') THEN
    
    SELECT EXISTS (
      SELECT 1 FROM posts 
      WHERE author_id = NEW.author_id 
      AND id != NEW.id
      AND moderation_reason IN ('VIOLENCE_CALL', 'DEHUMANIZATION', 'EXTREME_RAGE')
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
COMMENT ON COLUMN posts.moderation_reason IS 'Moderation category (ENUM) applied by admins only. Values: NONE (default), VIOLENCE_CALL, DEHUMANIZATION, EXTREME_RAGE. Moderated posts excluded from Discover tab.';
