/*
  # Create series_reports table

  ## Summary
  Adds reporting functionality for Post Series, mirroring the existing post_reports system.

  ## New Tables
  - `series_reports`
    - `id` (uuid, primary key)
    - `reporter_id` (uuid) - the user submitting the report
    - `series_id` (uuid) - the reported post series
    - `reported_user_id` (uuid) - the author of the series
    - `reason` (text) - required reason for the report
    - `description` (text) - optional additional details
    - `status` (report_status enum) - pending / upheld / dismissed
    - `reviewed_by` (uuid, nullable) - admin who reviewed
    - `reviewed_at` (timestamptz, nullable)
    - `admin_notes` (text, nullable)
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled; same policy pattern as post_reports
  - Authenticated users can insert reports for themselves only
  - Users can view their own submitted reports
  - Admins can view and update all series reports

  ## Indexes
  - reporter_id, series_id, status
*/

CREATE TABLE IF NOT EXISTS series_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  series_id uuid NOT NULL REFERENCES post_series(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status report_status DEFAULT 'pending',
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE series_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create series reports"
  ON series_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own series reports"
  ON series_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all series reports"
  ON series_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update series reports"
  ON series_reports
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

CREATE INDEX IF NOT EXISTS idx_series_reports_reporter_id ON series_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_series_reports_series_id ON series_reports(series_id);
CREATE INDEX IF NOT EXISTS idx_series_reports_status ON series_reports(status);
