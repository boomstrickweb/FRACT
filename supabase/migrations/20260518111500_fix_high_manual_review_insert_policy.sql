-- Add INSERT policy for high_manual_review to allow users to submit appeals
CREATE POLICY "Users can create their own high manual reviews"
  ON high_manual_review FOR INSERT
  WITH CHECK (auth.uid() = user_id);
