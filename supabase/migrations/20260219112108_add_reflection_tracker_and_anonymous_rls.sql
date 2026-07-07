/*
  # Add permanent reflection tracker

  ## Summary
  Adds a `reflection_tracker` table that permanently records when a user has reflected
  on a post, even if the reflection is later deleted. This enforces the one-reflection-
  per-user-per-post lifetime rule at the data layer.

  Also adds a trigger on the `reflections` table to automatically insert a record into
  `reflection_tracker` whenever a new reflection is created.

  ## New Table

  ### reflection_tracker
  - `user_id` (uuid, fk -> auth.users): the user who reflected
  - `post_id` (uuid, fk -> posts): the post that was reflected on
  - `reflected_at` (timestamptz): when the reflection was first created
  - Primary key is (user_id, post_id) to guarantee uniqueness

  ## Security
  - RLS enabled
  - Users can only read their own tracker entries
  - Inserts are handled by the trigger (SECURITY DEFINER) so no user insert policy needed

  ## Trigger
  - `record_reflection_tracker` fires AFTER INSERT on reflections
  - Uses INSERT ... ON CONFLICT DO NOTHING to be idempotent
*/

CREATE TABLE IF NOT EXISTS reflection_tracker (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reflected_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE reflection_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reflection tracker"
  ON reflection_tracker FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION record_reflection_in_tracker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO reflection_tracker (user_id, post_id, reflected_at)
  VALUES (NEW.author_id, NEW.post_id, now())
  ON CONFLICT (user_id, post_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_reflection_tracker ON reflections;

CREATE TRIGGER record_reflection_tracker
  AFTER INSERT ON reflections
  FOR EACH ROW
  EXECUTE FUNCTION record_reflection_in_tracker();

CREATE INDEX IF NOT EXISTS reflection_tracker_user_id_idx ON reflection_tracker(user_id);
CREATE INDEX IF NOT EXISTS reflection_tracker_post_id_idx ON reflection_tracker(post_id);
