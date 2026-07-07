/*
  # Enable Public Preview Access
  
  1. Security Updates
    - Add public (anon) read access to post_series
    - Add public (anon) read access to series_chapters
    - Add public (anon) read access to post_reactions
    
  2. Purpose
    - Allow non-logged users to see posts and post series in the Preview feed
*/

-- Enable public read for post_series
DROP POLICY IF EXISTS "Public can read all series" ON post_series;
CREATE POLICY "Public can read all series"
  ON post_series
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Enable public read for series_chapters
DROP POLICY IF EXISTS "Public can read all chapters" ON series_chapters;
CREATE POLICY "Public can read all chapters"
  ON series_chapters
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM post_series
      WHERE post_series.id = series_chapters.series_id
    )
  );

-- Enable public read for post_reactions
DROP POLICY IF EXISTS "Public can view all reactions" ON post_reactions;
CREATE POLICY "Public can view all reactions"
  ON post_reactions
  FOR SELECT
  TO anon, authenticated
  USING (
    -- If user is authenticated, check blocking relationships
    (
      (auth.uid() IS NULL) -- Anonymous users can see all reactions
      OR
      (
        -- Current user hasn't blocked the reactor
        (NOT (user_id IN (
          SELECT blocked_id FROM blocked_users WHERE blocker_id = auth.uid()
        )))
        AND
        -- Reactor hasn't blocked current user
        (NOT (user_id IN (
          SELECT blocker_id FROM blocked_users WHERE blocked_id = auth.uid()
        )))
      )
    )
  );
