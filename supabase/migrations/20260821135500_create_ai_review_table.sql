/*
  # Create AI Review Table
  
  1. New Tables
    - `ai_review`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references posts)
      - `user_id` (uuid, references profiles)
      - `status` (text, default 'pending')
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `ai_review` table
    - Add policies for users to create their own appeals
    - Add policies for admins to view and manage all appeals
*/

CREATE TABLE IF NOT EXISTS ai_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  series_id uuid REFERENCES post_series(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT one_target_check CHECK (
    (post_id IS NOT NULL AND series_id IS NULL) OR
    (post_id IS NULL AND series_id IS NOT NULL)
  )
);

ALTER TABLE ai_review ENABLE ROW LEVEL SECURITY;

-- Users can view their own appeals
CREATE POLICY "Users can view own AI appeals"
  ON ai_review FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own appeals
CREATE POLICY "Users can create AI appeals"
  ON ai_review FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins can manage all AI appeals"
  ON ai_review FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_review_post_id ON ai_review(post_id);
CREATE INDEX IF NOT EXISTS idx_ai_review_series_id ON ai_review(series_id);
CREATE INDEX IF NOT EXISTS idx_ai_review_user_id ON ai_review(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_review_status ON ai_review(status);
