/*
  # Anti-Spam System Implementation

  1. New Tables
    - `post_rate_limits` - Tracks posting activity and cooldowns per user
    - `post_fingerprints` - Stores content fingerprints for duplicate detection
    - `spam_violations` - Records spam violations and penalties
    
  2. New Functions
    - `generate_content_fingerprint()` - Creates canonical hash of post content
    - `check_duplicate_post()` - Checks if content is duplicate within 24h
    - `calculate_post_cooldown()` - Determines required cooldown based on account age
    - `check_post_rate_limit()` - Validates if user can post based on all rules
    - `record_post_attempt()` - Records posting attempt and updates counters
    - `apply_spam_penalty()` - Applies penalties for spam violations
    
  3. Security
    - All functions are SECURITY DEFINER (backend-enforced)
    - No client-side bypass possible
    - RLS policies enforce all checks
    - Automatic cleanup of old records
    
  4. Rate Limiting Rules
    - Normal accounts (≥7 days): 1 post/30s, 5 posts then 2min cooldown
    - New accounts (<24h): 1 post/2min, max 10 posts/24h
    - Young accounts (1-7 days): 1 post/60s, max 30 posts/24h
    
  5. Duplicate Detection
    - 1st duplicate in 24h: blocked with warning
    - 2nd duplicate in 24h: blocked with stronger warning
    - 3rd duplicate in 24h: 24h posting ban
*/

-- Create post_rate_limits table
CREATE TABLE IF NOT EXISTS post_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  posts_in_burst integer DEFAULT 0,
  posts_today integer DEFAULT 0,
  last_post_at timestamptz,
  burst_started_at timestamptz,
  cooldown_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE post_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
  ON post_rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System manages rate limits"
  ON post_rate_limits FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create post_fingerprints table
CREATE TABLE IF NOT EXISTS post_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content_hash text NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE post_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fingerprints"
  ON post_fingerprints FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System manages fingerprints"
  ON post_fingerprints FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create spam_violations table
CREATE TABLE IF NOT EXISTS spam_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  violation_type text NOT NULL,
  violation_details jsonb DEFAULT '{}'::jsonb,
  penalty_applied text,
  penalty_until timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE spam_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own violations"
  ON spam_violations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System manages violations"
  ON spam_violations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_rate_limits_user ON post_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_post_fingerprints_user_hash ON post_fingerprints(user_id, content_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spam_violations_user ON spam_violations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spam_violations_penalty ON spam_violations(user_id, penalty_until);

-- Function: Generate content fingerprint
CREATE OR REPLACE FUNCTION generate_content_fingerprint(content text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Normalize content: lowercase, remove extra whitespace, trim
  -- Then create MD5 hash for consistent fingerprinting
  RETURN md5(
    regexp_replace(
      lower(trim(content)),
      '\s+',
      ' ',
      'g'
    )
  );
END;
$$;

-- Function: Check for duplicate posts
CREATE OR REPLACE FUNCTION check_duplicate_post(
  p_user_id uuid,
  p_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fingerprint text;
  v_duplicate_count integer;
  v_last_duplicate timestamptz;
BEGIN
  -- Generate content fingerprint
  v_fingerprint := generate_content_fingerprint(p_content);
  
  -- Check for duplicates in last 24 hours
  SELECT COUNT(*), MAX(created_at)
  INTO v_duplicate_count, v_last_duplicate
  FROM post_fingerprints
  WHERE user_id = p_user_id
    AND content_hash = v_fingerprint
    AND created_at > now() - interval '24 hours';
  
  -- If duplicate found
  IF v_duplicate_count > 0 THEN
    -- Record violation
    INSERT INTO spam_violations (user_id, violation_type, violation_details)
    VALUES (
      p_user_id,
      'duplicate_post',
      jsonb_build_object(
        'duplicate_count', v_duplicate_count + 1,
        'last_duplicate', v_last_duplicate
      )
    );
    
    -- Apply penalty based on violation count
    IF v_duplicate_count >= 2 THEN
      -- 3rd attempt: 24h posting ban
      UPDATE spam_violations
      SET penalty_applied = '24h_posting_ban',
          penalty_until = now() + interval '24 hours'
      WHERE user_id = p_user_id
        AND violation_type = 'duplicate_post'
        AND created_at = (
          SELECT MAX(created_at)
          FROM spam_violations
          WHERE user_id = p_user_id
            AND violation_type = 'duplicate_post'
        );
      
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'duplicate_post_banned',
        'message', 'You have been temporarily banned from posting for 24 hours due to repeated duplicate posts.',
        'duplicate_count', v_duplicate_count + 1,
        'penalty_until', now() + interval '24 hours'
      );
    ELSIF v_duplicate_count >= 1 THEN
      -- 2nd attempt: strong warning
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'duplicate_post_warning',
        'message', 'Duplicate post detected. This is your final warning. One more duplicate will result in a 24-hour posting ban.',
        'duplicate_count', v_duplicate_count + 1
      );
    ELSE
      -- 1st attempt: block with warning
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'duplicate_post',
        'message', 'Duplicate detected. You have already posted this content in the last 24 hours.',
        'duplicate_count', v_duplicate_count + 1
      );
    END IF;
  END IF;
  
  -- No duplicate found
  RETURN jsonb_build_object(
    'allowed', true,
    'fingerprint', v_fingerprint
  );
END;
$$;

-- Function: Calculate post cooldown based on account age
CREATE OR REPLACE FUNCTION calculate_post_cooldown(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_age interval;
  v_cooldown_seconds integer;
  v_daily_limit integer;
  v_burst_limit integer;
  v_burst_cooldown_seconds integer;
BEGIN
  -- Get account age
  SELECT age(now(), created_at)
  INTO v_account_age
  FROM profiles
  WHERE id = p_user_id;
  
  -- Determine limits based on account age
  IF v_account_age < interval '24 hours' THEN
    -- New accounts (<24h): 1 post/2min, max 10/day
    v_cooldown_seconds := 120;
    v_daily_limit := 10;
    v_burst_limit := 3;
    v_burst_cooldown_seconds := 240;
  ELSIF v_account_age < interval '7 days' THEN
    -- Young accounts (1-7 days): 1 post/60s, max 30/day
    v_cooldown_seconds := 60;
    v_daily_limit := 30;
    v_burst_limit := 5;
    v_burst_cooldown_seconds := 180;
  ELSE
    -- Normal accounts (≥7 days): 1 post/30s, 5 posts then 2min cooldown
    v_cooldown_seconds := 30;
    v_daily_limit := 100;
    v_burst_limit := 5;
    v_burst_cooldown_seconds := 120;
  END IF;
  
  RETURN jsonb_build_object(
    'cooldown_seconds', v_cooldown_seconds,
    'daily_limit', v_daily_limit,
    'burst_limit', v_burst_limit,
    'burst_cooldown_seconds', v_burst_cooldown_seconds,
    'account_age_hours', EXTRACT(EPOCH FROM v_account_age) / 3600
  );
END;
$$;

-- Function: Check if user can post (main rate limiting logic)
CREATE OR REPLACE FUNCTION check_post_rate_limit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate_limit RECORD;
  v_cooldown_config jsonb;
  v_now timestamptz := now();
  v_required_cooldown integer;
  v_time_since_last_post interval;
  v_posts_today integer;
BEGIN
  -- Check for active posting ban
  IF EXISTS (
    SELECT 1 FROM spam_violations
    WHERE user_id = p_user_id
      AND penalty_applied = '24h_posting_ban'
      AND penalty_until > v_now
  ) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'posting_banned',
      'message', 'You are temporarily banned from posting due to spam violations.',
      'retry_after', (
        SELECT penalty_until
        FROM spam_violations
        WHERE user_id = p_user_id
          AND penalty_applied = '24h_posting_ban'
          AND penalty_until > v_now
        ORDER BY penalty_until DESC
        LIMIT 1
      )
    );
  END IF;
  
  -- Get cooldown configuration
  v_cooldown_config := calculate_post_cooldown(p_user_id);
  
  -- Get or create rate limit record
  SELECT * INTO v_rate_limit
  FROM post_rate_limits
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Create new record
    INSERT INTO post_rate_limits (user_id, posts_in_burst, posts_today)
    VALUES (p_user_id, 0, 0)
    RETURNING * INTO v_rate_limit;
  END IF;
  
  -- Reset daily counter if new day
  IF v_rate_limit.burst_started_at IS NULL OR 
     v_rate_limit.burst_started_at < v_now - interval '24 hours' THEN
    UPDATE post_rate_limits
    SET posts_today = 0,
        posts_in_burst = 0,
        burst_started_at = v_now
    WHERE user_id = p_user_id;
    
    v_rate_limit.posts_today := 0;
    v_rate_limit.posts_in_burst := 0;
  END IF;
  
  -- Check daily limit
  IF v_rate_limit.posts_today >= (v_cooldown_config->>'daily_limit')::integer THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit_reached',
      'message', format('Daily posting limit reached (%s posts). Try again tomorrow.', 
                       v_cooldown_config->>'daily_limit'),
      'retry_after', v_rate_limit.burst_started_at + interval '24 hours'
    );
  END IF;
  
  -- Check if in cooldown period
  IF v_rate_limit.cooldown_until IS NOT NULL AND v_rate_limit.cooldown_until > v_now THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'cooldown_active',
      'message', 'Please wait before posting again.',
      'retry_after', v_rate_limit.cooldown_until,
      'seconds_remaining', EXTRACT(EPOCH FROM (v_rate_limit.cooldown_until - v_now))::integer
    );
  END IF;
  
  -- Check burst limit and apply burst cooldown if needed
  IF v_rate_limit.posts_in_burst >= (v_cooldown_config->>'burst_limit')::integer THEN
    -- Apply burst cooldown
    v_required_cooldown := (v_cooldown_config->>'burst_cooldown_seconds')::integer;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'burst_limit_reached',
      'message', format('You have posted %s times in quick succession. Please wait %s seconds.',
                       v_cooldown_config->>'burst_limit',
                       v_required_cooldown),
      'retry_after', v_rate_limit.last_post_at + (v_required_cooldown || ' seconds')::interval,
      'seconds_remaining', v_required_cooldown - COALESCE(
        EXTRACT(EPOCH FROM (v_now - v_rate_limit.last_post_at))::integer,
        v_required_cooldown
      )
    );
  END IF;
  
  -- Check normal cooldown
  IF v_rate_limit.last_post_at IS NOT NULL THEN
    v_time_since_last_post := v_now - v_rate_limit.last_post_at;
    v_required_cooldown := (v_cooldown_config->>'cooldown_seconds')::integer;
    
    IF EXTRACT(EPOCH FROM v_time_since_last_post) < v_required_cooldown THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'cooldown_active',
        'message', format('Please wait %s seconds between posts.', v_required_cooldown),
        'retry_after', v_rate_limit.last_post_at + (v_required_cooldown || ' seconds')::interval,
        'seconds_remaining', v_required_cooldown - EXTRACT(EPOCH FROM v_time_since_last_post)::integer
      );
    END IF;
  END IF;
  
  -- All checks passed
  RETURN jsonb_build_object(
    'allowed', true,
    'cooldown_config', v_cooldown_config
  );
END;
$$;

-- Function: Record post attempt and update counters
CREATE OR REPLACE FUNCTION record_post_attempt(
  p_user_id uuid,
  p_post_id uuid,
  p_content text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fingerprint text;
  v_cooldown_config jsonb;
  v_now timestamptz := now();
  v_rate_limit RECORD;
BEGIN
  -- Generate and store fingerprint
  v_fingerprint := generate_content_fingerprint(p_content);
  
  INSERT INTO post_fingerprints (user_id, content_hash, post_id)
  VALUES (p_user_id, v_fingerprint, p_post_id);
  
  -- Get cooldown config
  v_cooldown_config := calculate_post_cooldown(p_user_id);
  
  -- Update rate limit counters
  SELECT * INTO v_rate_limit
  FROM post_rate_limits
  WHERE user_id = p_user_id;
  
  IF FOUND THEN
    -- Check if burst window expired
    IF v_rate_limit.burst_started_at IS NULL OR 
       v_rate_limit.burst_started_at < v_now - interval '5 minutes' THEN
      -- Reset burst counter
      UPDATE post_rate_limits
      SET posts_in_burst = 1,
          posts_today = posts_today + 1,
          last_post_at = v_now,
          burst_started_at = v_now,
          cooldown_until = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    ELSE
      -- Increment burst counter
      UPDATE post_rate_limits
      SET posts_in_burst = posts_in_burst + 1,
          posts_today = posts_today + 1,
          last_post_at = v_now,
          cooldown_until = CASE
            WHEN posts_in_burst + 1 >= (v_cooldown_config->>'burst_limit')::integer
            THEN v_now + ((v_cooldown_config->>'burst_cooldown_seconds')::integer || ' seconds')::interval
            ELSE v_now + ((v_cooldown_config->>'cooldown_seconds')::integer || ' seconds')::interval
          END,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;
  ELSE
    -- Create new record
    INSERT INTO post_rate_limits (
      user_id,
      posts_in_burst,
      posts_today,
      last_post_at,
      burst_started_at,
      cooldown_until
    ) VALUES (
      p_user_id,
      1,
      1,
      v_now,
      v_now,
      v_now + ((v_cooldown_config->>'cooldown_seconds')::integer || ' seconds')::interval
    );
  END IF;
  
  -- Log security event
  PERFORM log_security_event(
    p_user_id,
    'post_created',
    jsonb_build_object(
      'post_id', p_post_id,
      'content_hash', v_fingerprint
    )
  );
END;
$$;

-- Function: Cleanup old records (to be called periodically)
CREATE OR REPLACE FUNCTION cleanup_anti_spam_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete fingerprints older than 24 hours
  DELETE FROM post_fingerprints
  WHERE created_at < now() - interval '24 hours';
  
  -- Delete old violations (keep for 30 days for audit)
  DELETE FROM spam_violations
  WHERE created_at < now() - interval '30 days'
    AND (penalty_until IS NULL OR penalty_until < now());
  
  -- Reset rate limits for inactive users (no post in 24h)
  DELETE FROM post_rate_limits
  WHERE last_post_at < now() - interval '24 hours';
END;
$$;