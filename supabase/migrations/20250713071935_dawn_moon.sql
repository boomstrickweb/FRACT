/*
  # Fix post_edit_history RLS policies

  1. Security
    - Add INSERT policy for post_edit_history table
    - Allow users to create edit history for their own posts
    - Ensure the trigger can properly insert records when posts are updated

  2. Changes
    - Add INSERT policy that allows authenticated users to create edit history records
    - Policy checks that the post being edited belongs to the current user
*/

-- Add INSERT policy for post_edit_history table
CREATE POLICY "Users can create edit history for own posts"
  ON post_edit_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_edit_history.post_id 
      AND posts.author_id = auth.uid()
    )
  );