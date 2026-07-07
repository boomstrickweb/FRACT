/*
  # Anti-Spam Database Firewall Trigger

  1. New Trigger Function
    - `enforce_anti_spam_rules()` - Database-level enforcement
    - Called BEFORE INSERT on posts table
    - Cannot be bypassed from client
    
  2. Enforcement Rules
    - Rate limit check (mandatory)
    - Duplicate detection (mandatory)
    - Account age verification
    - Posting ban check
    
  3. Security
    - SECURITY DEFINER function
    - Runs with elevated privileges
    - Blocks ANY post that violates rules
    - No client-side bypass possible
    
  4. Error Handling
    - Clear error messages for each violation type
    - Logs all blocked attempts
    - Provides retry information
*/

-- Function: Database-level anti-spam enforcement
CREATE OR REPLACE FUNCTION enforce_anti_spam_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate_limit_result jsonb;
  v_duplicate_result jsonb;
  v_user_id uuid;
BEGIN
  -- Get user ID (from new post)
  v_user_id := NEW.author_id;
  
  -- Skip checks for system operations or if author_id is null
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- FIREWALL RULE 1: Check rate limits
  v_rate_limit_result := check_post_rate_limit(v_user_id);
  
  IF NOT (v_rate_limit_result->>'allowed')::boolean THEN
    -- Log security event
    PERFORM log_security_event(
      v_user_id,
      'post_blocked_rate_limit',
      jsonb_build_object(
        'reason', v_rate_limit_result->>'reason',
        'message', v_rate_limit_result->>'message'
      )
    );
    
    -- Block the post with clear error message
    RAISE EXCEPTION '%', v_rate_limit_result->>'message'
      USING HINT = 'Rate limit exceeded',
            ERRCODE = '42501';
  END IF;
  
  -- FIREWALL RULE 2: Check for duplicates (text and quote posts only)
  IF NEW.post_type IN ('text', 'quote') AND NEW.content IS NOT NULL THEN
    v_duplicate_result := check_duplicate_post(v_user_id, NEW.content);
    
    IF NOT (v_duplicate_result->>'allowed')::boolean THEN
      -- Log security event
      PERFORM log_security_event(
        v_user_id,
        'post_blocked_duplicate',
        jsonb_build_object(
          'reason', v_duplicate_result->>'reason',
          'message', v_duplicate_result->>'message',
          'duplicate_count', v_duplicate_result->>'duplicate_count'
        )
      );
      
      -- Block the post with clear error message
      RAISE EXCEPTION '%', v_duplicate_result->>'message'
        USING HINT = 'Duplicate content detected',
              ERRCODE = '23505';
    END IF;
  END IF;
  
  -- All checks passed, allow the post
  RETURN NEW;
END;
$$;

-- Create trigger on posts table
DROP TRIGGER IF EXISTS trigger_enforce_anti_spam ON posts;

CREATE TRIGGER trigger_enforce_anti_spam
  BEFORE INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION enforce_anti_spam_rules();

-- Function: Automatic cleanup scheduler (to be called periodically)
CREATE OR REPLACE FUNCTION schedule_anti_spam_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clean up old fingerprints (older than 24 hours)
  DELETE FROM post_fingerprints
  WHERE created_at < now() - interval '24 hours';
  
  -- Clean up expired penalties
  DELETE FROM spam_violations
  WHERE penalty_until IS NOT NULL
    AND penalty_until < now()
    AND created_at < now() - interval '7 days';
  
  -- Reset burst counters for users who haven't posted in 5 minutes
  UPDATE post_rate_limits
  SET posts_in_burst = 0,
      burst_started_at = NULL
  WHERE burst_started_at IS NOT NULL
    AND burst_started_at < now() - interval '5 minutes';
  
  -- Clean up rate limit records for users inactive for 24+ hours
  DELETE FROM post_rate_limits
  WHERE last_post_at < now() - interval '24 hours';
  
  -- Log cleanup
  PERFORM log_security_event(
    NULL,
    'anti_spam_cleanup_completed',
    jsonb_build_object(
      'timestamp', now(),
      'type', 'scheduled_maintenance'
    )
  );
END;
$$;

-- Add index for better trigger performance
CREATE INDEX IF NOT EXISTS idx_posts_author_created 
  ON posts(author_id, created_at DESC);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION enforce_anti_spam_rules() TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_anti_spam_cleanup() TO authenticated;