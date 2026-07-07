/*
  # Simple Auto-Delete Expired Posts

  1. Functions
    - `cleanup_expired_posts()` - Deletes expired posts and returns count
    - `get_expired_posts_count()` - Counts expired posts for frontend

  2. Security
    - Functions are accessible to authenticated users
    - Uses security definer for proper permissions

  3. Usage
    - Frontend calls these functions periodically
    - No pg_cron dependency - works on all Supabase instances
*/

-- Function to delete expired posts
CREATE OR REPLACE FUNCTION cleanup_expired_posts()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired posts
  DELETE FROM posts 
  WHERE disappears_at IS NOT NULL 
    AND disappears_at <= NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup if any posts were deleted
  IF deleted_count > 0 THEN
    INSERT INTO cleanup_logs (action, count, created_at)
    VALUES ('auto_delete_expired_posts', deleted_count, NOW());
  END IF;
  
  RETURN deleted_count;
END;
$$;

-- Function to count expired posts (for frontend checking)
CREATE OR REPLACE FUNCTION get_expired_posts_count()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO expired_count
  FROM posts 
  WHERE disappears_at IS NOT NULL 
    AND disappears_at <= NOW();
  
  RETURN expired_count;
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_expired_posts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_expired_posts_count() TO authenticated;