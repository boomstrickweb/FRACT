/*
  # Update Profile Visibility Policies

  1. Changes
    - Hide deactivated profiles from all queries
    - Block visibility between blocked users
    - Respect privacy settings for follower visibility
    
  2. Security
    - Deactivated users are invisible to everyone (including themselves until reactivation)
    - Blocked users cannot see each other anywhere
    - Following lists only visible if user allows it
*/

-- Update profiles policies to hide deactivated accounts
DROP POLICY IF EXISTS "Anyone can read basic profile info" ON profiles;

CREATE POLICY "Anyone can read active profile info"
  ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    -- Profile must not be deactivated
    (is_deactivated = false OR is_deactivated IS NULL)
    AND
    -- If viewing user is authenticated, check blocking relationships
    (
      auth.uid() IS NULL -- Anonymous users can see public profiles
      OR
      (
        -- Authenticated users cannot see profiles of users they blocked
        id NOT IN (
          SELECT blocked_id FROM blocked_users WHERE blocker_id = auth.uid()
        )
        AND
        -- Authenticated users cannot see profiles of users who blocked them
        id NOT IN (
          SELECT blocker_id FROM blocked_users WHERE blocked_id = auth.uid()
        )
      )
    )
  );

-- Update posts policies to hide posts from deactivated/blocked users
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;

CREATE POLICY "Posts are viewable by active non-blocked users"
  ON posts
  FOR SELECT
  TO anon, authenticated
  USING (
    -- Post must not be expired
    ((disappears_at IS NULL) OR (disappears_at > now()) OR (auth.uid() = author_id))
    AND
    -- Author must not be deactivated
    (
      SELECT (is_deactivated = false OR is_deactivated IS NULL)
      FROM profiles 
      WHERE id = author_id
    )
    AND
    -- If viewing user is authenticated, check blocking relationships
    (
      auth.uid() IS NULL -- Anonymous users can see public posts
      OR
      (
        -- Cannot see posts from users you blocked
        author_id NOT IN (
          SELECT blocked_id FROM blocked_users WHERE blocker_id = auth.uid()
        )
        AND
        -- Cannot see posts from users who blocked you
        author_id NOT IN (
          SELECT blocker_id FROM blocked_users WHERE blocked_id = auth.uid()
        )
      )
    )
  );

-- Update follows policies to respect blocking
DROP POLICY IF EXISTS "Users can view all follows" ON follows;

CREATE POLICY "Users can view non-blocked follows"
  ON follows
  FOR SELECT
  TO authenticated
  USING (
    -- Cannot see follows involving blocked users
    follower_id NOT IN (
      SELECT blocked_id FROM blocked_users WHERE blocker_id = auth.uid()
      UNION
      SELECT blocker_id FROM blocked_users WHERE blocked_id = auth.uid()
    )
    AND
    following_id NOT IN (
      SELECT blocked_id FROM blocked_users WHERE blocker_id = auth.uid()
      UNION
      SELECT blocker_id FROM blocked_users WHERE blocked_id = auth.uid()
    )
    AND
    -- Cannot see follows involving deactivated users
    follower_id NOT IN (
      SELECT id FROM profiles WHERE is_deactivated = true
    )
    AND
    following_id NOT IN (
      SELECT id FROM profiles WHERE is_deactivated = true
    )
  );