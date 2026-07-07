/*
  # Fix moderation trigger to use correct column name

  ## Changes
  - Update trigger function to use `event_details` instead of `details`
  - Ensures compatibility with existing security_events table schema
*/

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
      event_details,
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
        event_details,
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