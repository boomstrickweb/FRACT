/*
  # Create post edit history table

  1. New Tables
    - `post_edit_history`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references posts.id)
      - `content` (text) - Content at this version
      - `quote_signature` (text, nullable) - Signature for quote posts
      - `edited_at` (timestamp) - When this edit was made
      - `version_number` (integer) - Version number (1, 2, 3, etc.)

  2. Security
    - Enable RLS on table
    - Add policies for viewing edit history
    - Only post authors and viewers can see edit history

  3. Functions
    - Function to create edit history entry when post is updated
    - Trigger to automatically create history entries
*/

-- Create post edit history table
CREATE TABLE IF NOT EXISTS post_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  content text NOT NULL,
  quote_signature text,
  edited_at timestamptz DEFAULT now(),
  version_number integer NOT NULL
);

-- Enable RLS
ALTER TABLE post_edit_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view edit history of posts they can see"
  ON post_edit_history
  FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_edit_history.post_id 
      AND (
        (posts.disappears_at IS NULL OR posts.disappears_at > now()) OR 
        (auth.uid() = posts.author_id)
      )
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS post_edit_history_post_id_idx ON post_edit_history(post_id);
CREATE INDEX IF NOT EXISTS post_edit_history_version_idx ON post_edit_history(post_id, version_number);

-- Function to create edit history entry
CREATE OR REPLACE FUNCTION create_post_edit_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create history if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content OR 
     OLD.quote_signature IS DISTINCT FROM NEW.quote_signature THEN
    
    INSERT INTO post_edit_history (
      post_id,
      content,
      quote_signature,
      edited_at,
      version_number
    )
    VALUES (
      OLD.id,
      OLD.content,
      OLD.quote_signature,
      OLD.updated_at,
      COALESCE(
        (SELECT MAX(version_number) FROM post_edit_history WHERE post_id = OLD.id),
        0
      ) + 1
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for posts table
DROP TRIGGER IF EXISTS create_post_edit_history_trigger ON posts;
CREATE TRIGGER create_post_edit_history_trigger
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION create_post_edit_history();