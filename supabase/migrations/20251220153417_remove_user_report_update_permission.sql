/*
  # Remove User Permission to Update Reports

  1. Changes
    - Remove policy allowing users to update report status
    - Users can only view their reports
    - Only database admins can update status through database interface
  
  2. Security
    - Users can create reports (INSERT)
    - Users can view their own reports (SELECT)
    - Users CANNOT update report status
*/

-- Remove the update policy that allows users to change status
DROP POLICY IF EXISTS "Authenticated users can update user report status" ON user_reports;

-- Users can only view and create reports, not update them
-- The SELECT and INSERT policies remain unchanged