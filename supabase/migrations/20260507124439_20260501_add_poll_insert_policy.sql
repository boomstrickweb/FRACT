/*
  # Add poll insert policy

  1. New Policies
    - Allow authenticated users to insert polls they create
*/

CREATE POLICY "Authenticated users can create polls"
  ON polls FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);
