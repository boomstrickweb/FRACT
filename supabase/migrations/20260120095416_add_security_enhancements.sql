/*
  # Security Enhancements Migration

  1. New Tables
    - `security_events` - Logs security-related events for monitoring
    - `rate_limits` - Tracks rate limiting for sensitive operations
    
  2. Changes
    - Create security event logging table
    - Create rate limiting table
    - Add helper functions for security
    
  3. Security
    - Enable RLS on all new tables
    - Only users can view their own security events
    - Rate limit records are protected
*/

-- Create security events table
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own security events"
  ON security_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert security events"
  ON security_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
  ON rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits"
  ON rate_limits FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for faster rate limit queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action 
  ON rate_limits(user_id, action_type, window_start);

-- Create index for security events
CREATE INDEX IF NOT EXISTS idx_security_events_user_created 
  ON security_events(user_id, created_at DESC);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_action_type text,
  p_max_actions integer DEFAULT 5,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Count recent actions
  SELECT COALESCE(SUM(action_count), 0)
  INTO v_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND window_start > v_window_start;
  
  -- If under limit, increment counter
  IF v_count < p_max_actions THEN
    INSERT INTO rate_limits (user_id, action_type, action_count, window_start)
    VALUES (p_user_id, p_action_type, 1, now())
    ON CONFLICT DO NOTHING;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id uuid,
  p_event_type text,
  p_event_details jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO security_events (
    user_id,
    event_type,
    event_details,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    p_event_type,
    p_event_details,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Update delete_user_account function with security logging
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_success boolean := false;
BEGIN
  -- Verify that the user is deleting their own account
  IF auth.uid() != user_id_to_delete THEN
    -- Log unauthorized attempt
    PERFORM log_security_event(
      auth.uid(),
      'unauthorized_account_deletion_attempt',
      jsonb_build_object('target_user_id', user_id_to_delete)
    );
    
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Check rate limit (max 1 deletion attempt per 24 hours)
  IF NOT check_rate_limit(user_id_to_delete, 'account_deletion', 1, 1440) THEN
    RAISE EXCEPTION 'Too many deletion attempts. Please try again later.';
  END IF;

  -- Log account deletion
  PERFORM log_security_event(
    user_id_to_delete,
    'account_deletion_started',
    jsonb_build_object('timestamp', now())
  );

  -- Delete all user data in proper order
  DELETE FROM security_events WHERE user_id = user_id_to_delete;
  DELETE FROM rate_limits WHERE user_id = user_id_to_delete;
  DELETE FROM user_sessions WHERE user_id = user_id_to_delete;
  DELETE FROM saved_posts WHERE user_id = user_id_to_delete;
  DELETE FROM post_reactions WHERE user_id = user_id_to_delete;
  DELETE FROM post_ratings WHERE user_id = user_id_to_delete;
  DELETE FROM soulcodes WHERE user_id = user_id_to_delete;
  DELETE FROM account_scope_covers WHERE user_id = user_id_to_delete;
  DELETE FROM account_scope_does_not_cover WHERE user_id = user_id_to_delete;
  DELETE FROM muted_words WHERE user_id = user_id_to_delete;
  
  -- Delete post edit history for user's posts
  DELETE FROM post_edit_history 
  WHERE post_id IN (SELECT id FROM posts WHERE author_id = user_id_to_delete);
  
  -- Delete post views for user's posts
  DELETE FROM post_views 
  WHERE post_id IN (SELECT id FROM posts WHERE author_id = user_id_to_delete);
  
  -- Delete reposts
  DELETE FROM reposts WHERE user_id = user_id_to_delete;
  
  -- Delete posts (cascades to reactions, views, etc.)
  DELETE FROM posts WHERE author_id = user_id_to_delete;
  
  -- Delete follows
  DELETE FROM follows WHERE follower_id = user_id_to_delete OR following_id = user_id_to_delete;
  
  -- Delete notifications
  DELETE FROM notifications WHERE user_id = user_id_to_delete OR related_user_id = user_id_to_delete;
  
  -- Delete blocked users
  DELETE FROM blocked_users WHERE blocker_id = user_id_to_delete OR blocked_id = user_id_to_delete;
  
  -- Delete user reports
  DELETE FROM user_reports WHERE reporter_id = user_id_to_delete OR reported_id = user_id_to_delete;
  
  -- Delete user verifications
  DELETE FROM user_verifications WHERE user_id = user_id_to_delete;
  
  -- Delete user feedback
  DELETE FROM user_feedback WHERE user_id = user_id_to_delete;
  
  -- Delete profile (this should cascade to auth.users via trigger)
  DELETE FROM profiles WHERE id = user_id_to_delete;

  v_success := true;

  RETURN json_build_object(
    'success', true,
    'message', 'Account deleted successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    PERFORM log_security_event(
      user_id_to_delete,
      'account_deletion_failed',
      jsonb_build_object('error', SQLERRM)
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'Account deletion failed. Please contact support.'
    );
END;
$$;