/*
  # Create post_reports table

  1. New Tables
    - `post_reports`
      - `id` (uuid, primary key)
      - `reporter_id` (uuid, references profiles)
      - `post_id` (uuid, references posts)
      - `reported_user_id` (uuid, references profiles) - the author of the reported post
      - `reason` (text, required)
      - `description` (text, optional additional details)
      - `status` (report_status enum: pending, upheld, dismissed)
      - `reviewed_by` (uuid, references profiles, nullable)
      - `reviewed_at` (timestamptz, nullable)
      - `admin_notes` (text, nullable)
      - `created_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `post_reports` table
    - Users can insert reports for themselves only
    - Users can view their own submitted reports
    - Admins can view all post reports
    - Admins can update post reports (for review)

  3. Indexes
    - Index on reporter_id for efficient lookup of user's reports
    - Index on post_id for finding reports per post
    - Index on status for admin filtering
*/

CREATE TABLE IF NOT EXISTS post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status report_status DEFAULT 'pending',
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create post reports"
  ON post_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own post reports"
  ON post_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all post reports"
  ON post_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update post reports"
  ON post_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_post_reports_reporter_id ON post_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status);
