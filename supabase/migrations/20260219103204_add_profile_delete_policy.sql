/*
  # Add DELETE policy to profiles table

  ## Summary
  Allows authenticated users to delete their own profile row.
  Because all child tables reference profiles with ON DELETE CASCADE,
  this single delete cascades and removes all user data automatically.

  ## Security
  - Only the authenticated user can delete their own profile row
  - Checked via auth.uid() = id
*/

CREATE POLICY "Users can delete own profile"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);
