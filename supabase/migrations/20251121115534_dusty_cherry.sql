/*
  # Automatic cleanup of expired posts

  1. Function
    - `cleanup_expired_posts()` - Deletes posts where disappears_at < now()
    
  2. Scheduled Job
    - Runs every 5 minutes to clean up expired posts
    - Uses pg_cron extension for scheduling
*/

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to cleanup expired posts
CREATE OR REPLACE FUNCTION cleanup_expired_posts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete posts that have expired
  DELETE FROM posts 
  WHERE disappears_at IS NOT NULL 
    AND disappears_at <= NOW();
  
  -- Get the number of deleted rows
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup (optional)
  INSERT INTO cleanup_logs (action, count, created_at) 
  VALUES ('cleanup_expired_posts', deleted_count, NOW())
  ON CONFLICT DO NOTHING;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create cleanup logs table (optional, for monitoring)
CREATE TABLE IF NOT EXISTS cleanup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on cleanup_logs
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Policy for cleanup_logs (only system can access)
CREATE POLICY "System can manage cleanup logs"
  ON cleanup_logs
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Schedule the cleanup function to run every 5 minutes
-- Note: This requires superuser privileges and pg_cron extension
SELECT cron.schedule(
  'cleanup-expired-posts',
  '*/5 * * * *', -- Every 5 minutes
  'SELECT cleanup_expired_posts();'
);

-- Alternative: Create a function that can be called manually or via webhook
CREATE OR REPLACE FUNCTION public.manual_cleanup_expired_posts()
RETURNS JSON AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Call the cleanup function
  SELECT cleanup_expired_posts() INTO deleted_count;
  
  -- Return result as JSON
  RETURN json_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.manual_cleanup_expired_posts() TO authenticated;