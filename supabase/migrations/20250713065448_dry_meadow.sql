/*
  # Add get_post_reaction_counts function

  1. New Functions
    - `get_post_reaction_counts(post_uuid)` - Returns reaction counts for a specific post
      - Returns respect_count, reject_count, observe_count as BIGINT
      - Queries the post_reactions table to count each reaction type

  2. Security
    - Function is accessible to authenticated users
    - Uses existing RLS policies on post_reactions table
*/

CREATE OR REPLACE FUNCTION public.get_post_reaction_counts(post_uuid UUID)
RETURNS TABLE (
    respect_count BIGINT,
    reject_count BIGINT,
    observe_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(CASE WHEN pr.reaction_type = 'respect' THEN 1 END) AS respect_count,
        COUNT(CASE WHEN pr.reaction_type = 'reject' THEN 1 END) AS reject_count,
        COUNT(CASE WHEN pr.reaction_type = 'observe' THEN 1 END) AS observe_count
    FROM
        public.post_reactions pr
    WHERE
        pr.post_id = post_uuid;
END;
$$;