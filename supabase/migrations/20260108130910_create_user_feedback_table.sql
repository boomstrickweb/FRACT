/*
  # Create User Feedback Table

  1. New Tables
    - `user_feedback`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `feedback_type` (text) - Feature request, UI/UX improvement, Bug report, Moderation concern, General feedback
      - `feedback_text` (text) - The actual feedback content
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `status` (text, default 'pending') - pending, reviewed, implemented, dismissed

  2. Security
    - Enable RLS on `user_feedback` table
    - Users can insert their own feedback
    - Users can view their own feedback
    - No updates or deletes allowed (feedback is permanent)
*/

-- Create user_feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('feature_request', 'ui_ux_improvement', 'bug_report', 'moderation_concern', 'general_feedback')),
  feedback_text text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'implemented', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON user_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON user_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);