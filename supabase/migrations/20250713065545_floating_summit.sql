/*
  # Create post_reactions table and functions

  1. New Tables
    - `post_reactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `post_id` (uuid, foreign key to posts)
      - `reaction_type` (enum: respect, reject, observe)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `post_reactions` table
    - Add policies for authenticated users to manage their own reactions

  3. Functions
    - `handle_post_reaction` - Add or update a reaction
    - `remove_post_reaction` - Remove a reaction
    - `get_post_reaction_counts` - Get reaction counts for a post
*/

-- Create reaction type enum
CREATE TYPE reaction_type AS ENUM ('respect', 'reject', 'observe');

-- Create post_reactions table
CREATE TABLE IF NOT EXISTS post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  reaction_type reaction_type NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Add foreign key constraints
ALTER TABLE post_reactions 
ADD CONSTRAINT post_reactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE post_reactions 
ADD CONSTRAINT post_reactions_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert own reactions"
  ON post_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reactions"
  ON post_reactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON post_reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all reactions"
  ON post_reactions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX post_reactions_user_id_idx ON post_reactions(user_id);
CREATE INDEX post_reactions_post_id_idx ON post_reactions(post_id);
CREATE INDEX post_reactions_reaction_type_idx ON post_reactions(reaction_type);

-- Function to handle post reactions
CREATE OR REPLACE FUNCTION handle_post_reaction(
  post_uuid uuid,
  reaction reaction_type
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO post_reactions (user_id, post_id, reaction_type)
  VALUES (auth.uid(), post_uuid, reaction)
  ON CONFLICT (user_id, post_id)
  DO UPDATE SET 
    reaction_type = reaction,
    created_at = now();
END;
$$;

-- Function to remove post reaction
CREATE OR REPLACE FUNCTION remove_post_reaction(
  post_uuid uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM post_reactions
  WHERE user_id = auth.uid() AND post_id = post_uuid;
END;
$$;

-- Function to get post reaction counts
CREATE OR REPLACE FUNCTION get_post_reaction_counts(
  post_uuid uuid
)
RETURNS TABLE(
  respect_count bigint,
  reject_count bigint,
  observe_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN reaction_type = 'respect' THEN 1 ELSE 0 END), 0) as respect_count,
    COALESCE(SUM(CASE WHEN reaction_type = 'reject' THEN 1 ELSE 0 END), 0) as reject_count,
    COALESCE(SUM(CASE WHEN reaction_type = 'observe' THEN 1 ELSE 0 END), 0) as observe_count
  FROM post_reactions
  WHERE post_id = post_uuid;
END;
$$;