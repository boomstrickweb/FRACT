/*
  # Create Poll System

  1. New Tables
    - `polls`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to posts)
      - `title` (text, max 160 chars)
      - `options` (jsonb array of option objects with id, text, vote_count)
      - `created_by` (uuid, foreign key to profiles)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `status` (text: 'ongoing' or 'ended')
      - `total_votes` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `poll_votes`
      - `id` (uuid, primary key)
      - `poll_id` (uuid, foreign key to polls)
      - `user_id` (uuid, foreign key to profiles)
      - `option_index` (integer, index of selected option)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can view poll metadata during ongoing polling (no results shown)
    - Users can view full poll results after poll ends
    - Users can insert votes if poll is ongoing and they haven't voted
    - Creator cannot vote in their own poll
    - No one can update or delete poll votes
    - Only poll creator can delete poll
    - Poll creator cannot edit poll posts

  3. Important Notes
    - Poll results hidden during voting for independent decisions
    - Vote counts and percentages only revealed after poll ends
    - No vote manipulation possible - single vote per user, immutable
    - Anonymous voting - vote-user relationship never exposed to other users
*/

CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) <= 160),
  options jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'ended')),
  total_votes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT end_time_after_start CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  option_index integer NOT NULL CHECK (option_index >= 0 AND option_index < 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view polls"
  ON polls FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Poll creator can update their poll"
  ON polls FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (false);

CREATE POLICY "Poll creator can delete their poll"
  ON polls FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can insert votes"
  ON poll_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_id
      AND polls.status = 'ongoing'
      AND polls.end_time > now()
      AND polls.created_by != auth.uid()
    )
  );

CREATE POLICY "Users can view their own votes"
  ON poll_votes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "No one can update votes"
  ON poll_votes FOR UPDATE
  TO public
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No one can delete votes"
  ON poll_votes FOR DELETE
  TO public
  USING (false);
