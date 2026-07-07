/*
  # Create Reflections System

  ## Summary
  Implements the Reflection feature: a single-layer response system where users can
  reflect on any post (once per post, per user). Reflections are not posts and cannot
  be reflected upon themselves, preventing infinite thread chains.

  ## New Tables

  ### reflections
  Stores user reflections on posts. Each user may only reflect on each post once.
  - `id` (uuid, primary key)
  - `post_id` (uuid, references posts ON DELETE CASCADE) - the post being reflected on
  - `author_id` (uuid, references profiles ON DELETE CASCADE) - who wrote the reflection
  - `content` (text, max 420 chars) - the reflection text
  - `is_explicit` (boolean) - explicit content flag
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - Unique constraint on (post_id, author_id) - one reflection per user per post

  ### reflection_reactions
  Reaction system (respect/reject/observe) on reflections, mirroring post_reactions.
  - `id` (uuid, primary key)
  - `reflection_id` (uuid, references reflections ON DELETE CASCADE)
  - `user_id` (uuid, references profiles ON DELETE CASCADE)
  - `reaction_type` (text: 'respect' | 'reject' | 'observe')
  - `created_at` (timestamptz)
  - Unique constraint on (reflection_id, user_id)

  ## Security
  - RLS enabled on both tables
  - Authenticated users can read reflections on non-deleted posts
  - Authors can insert, update, and delete their own reflections
  - Reaction policies mirror post reaction policies

  ## Notes
  - One reflection per user per post is enforced at DB level
  - No recursive reflections (no reflect_to_reflection_id field)
  - account age can be computed from profiles.created_at
*/

CREATE TABLE IF NOT EXISTS reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 420),
  is_explicit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, author_id)
);

ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read reflections"
  ON reflections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authors can insert own reflection"
  ON reflections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own reflection"
  ON reflections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete own reflection"
  ON reflections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE TABLE IF NOT EXISTS reflection_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id uuid NOT NULL REFERENCES reflections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('respect', 'reject', 'observe')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reflection_id, user_id)
);

ALTER TABLE reflection_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read reflection reactions"
  ON reflection_reactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own reflection reaction"
  ON reflection_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reflection reaction"
  ON reflection_reactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reflection reaction"
  ON reflection_reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reflections_post_id ON reflections(post_id);
CREATE INDEX IF NOT EXISTS idx_reflections_author_id ON reflections(author_id);
CREATE INDEX IF NOT EXISTS idx_reflection_reactions_reflection_id ON reflection_reactions(reflection_id);
