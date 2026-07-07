/*
  # Fix mutual blocking policies

  1. Security Updates
    - Ensure blocked users cannot see each other mutually
    - Update all relevant table policies for mutual blocking
    - Fix profile visibility for blocked relationships

  2. Tables Updated
    - profiles: mutual blocking visibility
    - posts: mutual blocking in feed
    - follows: prevent blocked users from seeing follows
    - All other user interaction tables
*/

-- Update profiles policy to handle mutual blocking
DROP POLICY IF EXISTS "Anyone can read active profile info" ON profiles;

CREATE POLICY "Anyone can read active profile info"
  ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    -- Profile must be active (not deactivated)
    ((is_deactivated = false) OR (is_deactivated IS NULL))
    AND
    -- If user is authenticated, check blocking relationships
    (
      (auth.uid() IS NULL) -- Anonymous users can see all active profiles
      OR
      (
        -- Current user hasn't blocked this profile
        (NOT (id IN (
          SELECT blocked_id FROM blocked_users WHERE blocker_id = auth.uid()
        )))
        AND
        -- This profile hasn't blocked current user
        (NOT (id IN (
          SELECT blocker_id FROM blocked_users WHERE blocked_id = auth.uid()
        )))
      )
    )
  );

-- Update posts policy to handle mutual blocking
DROP POLICY IF EXISTS "Posts are viewable by active non-blocked users" ON posts;

CREATE POLICY "Posts are viewable by active non-blocked users"
  ON posts
  FOR SELECT
  TO anon, authenticated
  USING (
    -- Post must not be expired (unless viewing own post)
    ((disappears_at IS NULL) OR (disappears_at > now()) OR (auth.uid() = author_id))
    AND
    -- Author must be active
    (
      SELECT ((profiles.is_deactivated = false) OR (profiles.is_deactivated IS NULL))
      FROM profiles
      WHERE profiles.id = posts.author_id
    )
    AND
    -- If user is authenticated, check blocking relationships
    (
      (auth.uid() IS NULL) -- Anonymous users can see all posts
      OR
      (
        -- Current user hasn't blocked post author
        (NOT (author_id IN (
          SELECT blocked_id FROM blocked_users WHERE blocker_id = auth.uid()
        )))
        AND
        -- Post author hasn't blocked current user
        (NOT (author_id IN (
          SELECT blocker_id FROM blocked_users WHERE blocked_id = auth.uid()
        )))
      )
    )
  );

-- Update follows policy to handle mutual blocking
DROP POLICY IF EXISTS "Users can view non-blocked follows" ON follows;

CREATE POLICY "Users can view non-blocked follows"
  ON follows
  FOR SELECT
  TO authenticated
  USING (
    -- Neither follower nor following is blocked by current user
    (NOT (follower_id IN (
      SELECT blocked_id FROM blocked_users WHERE blocker_id = auth.uid()
    )))
    AND
    (NOT (following_id IN (
      SELECT blocked_id FROM blocked_users WHERE blocker_id = auth.uid()
    )))
    AND
    -- Neither follower nor following has blocked current user
    (NOT (follower_id IN (
      SELECT blocker_id FROM blocked_users WHERE blocked_id = auth.uid()
    )))
    AND
    (NOT (following_id IN (
      SELECT blocker_id FROM blocked_users WHERE blocked_id = auth.uid()
    )))
    AND
    -- Neither follower nor following is deactivated
    (NOT (follower_id IN (
      SELECT id FROM profiles WHERE is_deactivated = true
    )))
    AND
    (NOT (following_id IN (
      SELECT id FROM profiles WHERE is_deactivated = true
    )))
  );

-- Update post_reactions policy to handle mutual blocking
DROP POLICY IF EXISTS "Users can view all reactions" ON post_reactions;

CREATE POLICY "Users can view all reactions"
  ON post_reactions
  FOR SELECT
  TO authenticated
  USING (
    -- Current user hasn't blocked the reactor
    (NOT (user_id IN (
      SELECT blocked_id FROM blocked_users WHERE blocker_id = auth.uid()
    )))
    AND
    -- Reactor hasn't blocked current user
    (NOT (user_id IN (
      SELECT blocker_id FROM blocked_users WHERE blocked_id = auth.uid()
    )))
  );

-- Update reposts policy to handle mutual blocking
DROP POLICY IF EXISTS "Reposts are viewable by everyone" ON reposts;

CREATE POLICY "Reposts are viewable by everyone"
  ON reposts
  FOR SELECT
  TO anon, authenticated
  USING (
    -- If user is authenticated, check blocking relationships
    (
      (auth.uid() IS NULL) -- Anonymous users can see all reposts
      OR
      (
        -- Current user hasn't blocked reposter
        (NOT (user_id IN (
          SELECT blocked_id FROM blocked_users WHERE blocker_id = auth.uid()
        )))
        AND
        -- Reposter hasn't blocked current user
        (NOT (user_id IN (
          SELECT blocker_id FROM blocked_users WHERE blocked_id = auth.uid()
        )))
      )
    )
  );