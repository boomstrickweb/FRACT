/*
  # Add missing report moderation functions

  1. Functions
    - `get_user_reports_for_moderation` - Get user reports for a specific user
    - `get_post_reports_for_moderation` - Get post reports for a specific user
  
  2. Security
    - Functions use SECURITY DEFINER for proper access control
    - Grant execute permissions to authenticated users
*/

-- Function to get user reports for moderation
CREATE OR REPLACE FUNCTION public.get_user_reports_for_moderation(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  reporter_id uuid,
  reported_id uuid,
  reason text,
  description text,
  status text,
  created_at timestamptz,
  reporter_name text,
  reporter_username text,
  reported_name text,
  reported_username text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.id,
    ur.reporter_id,
    ur.reported_id,
    ur.reason,
    ur.description,
    ur.status,
    ur.created_at,
    rp.name as reporter_name,
    rp.username as reporter_username,
    rd.name as reported_name,
    rd.username as reported_username
  FROM user_reports ur
  LEFT JOIN profiles rp ON ur.reporter_id = rp.id
  LEFT JOIN profiles rd ON ur.reported_id = rd.id
  WHERE ur.reporter_id = user_uuid
  ORDER BY ur.created_at DESC;
END;
$$;

-- Function to get post reports for moderation
CREATE OR REPLACE FUNCTION public.get_post_reports_for_moderation(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  reporter_id uuid,
  post_id uuid,
  reason text,
  description text,
  status text,
  created_at timestamptz,
  reporter_name text,
  reporter_username text,
  post_content text,
  post_author_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.reporter_id,
    pr.post_id,
    pr.reason,
    pr.description,
    pr.status,
    pr.created_at,
    rp.name as reporter_name,
    rp.username as reporter_username,
    p.content as post_content,
    pa.name as post_author_name
  FROM post_reports pr
  LEFT JOIN profiles rp ON pr.reporter_id = rp.id
  LEFT JOIN posts p ON pr.post_id = p.id
  LEFT JOIN profiles pa ON p.author_id = pa.id
  WHERE pr.reporter_id = user_uuid
  ORDER BY pr.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_reports_for_moderation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_reports_for_moderation(uuid) TO authenticated;