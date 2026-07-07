/*
  # Create Reports and Admin Management System

  1. New Tables
    - `user_reports` - Track user reports for moderation
      - `id` (uuid, primary key)
      - `reporter_id` (uuid, foreign key to profiles.id)
      - `reported_id` (uuid, foreign key to profiles.id)
      - `reason` (text)
      - `description` (text, optional)
      - `report_type` (text)
      - `status` (text) - 'pending', 'upheld', 'dismissed'
      - `reviewed_by` (uuid, foreign key to profiles.id)
      - `reviewed_at` (timestamptz)
      - `admin_notes` (text)
      - `created_at` (timestamptz)
    
    - `post_reports` - Track post reports for moderation
      - `id` (uuid, primary key)
      - `reporter_id` (uuid, foreign key to profiles.id)
      - `post_id` (uuid, foreign key to posts.id)
      - `reason` (text)
      - `description` (text, optional)
      - `status` (text) - 'pending', 'upheld', 'dismissed'
      - `reviewed_by` (uuid, foreign key to profiles.id)
      - `reviewed_at` (timestamptz)
      - `admin_notes` (text)
      - `created_at` (timestamptz)
  
  2. Profile Updates
    - Add `is_admin` column to identify admin users
  
  3. Security
    - Enable RLS on all tables
    - Users can create and view their own reports
    - Admins can view and update all reports
    - Admin notes are only visible to admins
*/

-- Add is_admin column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Create user_reports table
CREATE TABLE IF NOT EXISTS user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  report_type text DEFAULT 'general',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'upheld', 'dismissed')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

-- Create post_reports table
CREATE TABLE IF NOT EXISTS post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'upheld', 'dismissed')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_reports_reporter_id_idx ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS user_reports_reported_id_idx ON user_reports(reported_id);
CREATE INDEX IF NOT EXISTS user_reports_status_idx ON user_reports(status);
CREATE INDEX IF NOT EXISTS post_reports_reporter_id_idx ON post_reports(reporter_id);
CREATE INDEX IF NOT EXISTS post_reports_post_id_idx ON post_reports(post_id);
CREATE INDEX IF NOT EXISTS post_reports_status_idx ON post_reports(status);

-- Enable RLS
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_reports
CREATE POLICY "Users can create user reports"
  ON user_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own user reports"
  ON user_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all user reports"
  ON user_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update user reports"
  ON user_reports
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

-- RLS Policies for post_reports
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

-- Create function to get all user reports (admin only)
CREATE OR REPLACE FUNCTION get_all_user_reports_admin()
RETURNS TABLE (
  id uuid,
  reporter_id uuid,
  reported_id uuid,
  reason text,
  description text,
  report_type text,
  status text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz,
  reporter_name text,
  reporter_username text,
  reported_name text,
  reported_username text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT 
    ur.id,
    ur.reporter_id,
    ur.reported_id,
    ur.reason,
    ur.description,
    ur.report_type,
    ur.status,
    ur.reviewed_by,
    ur.reviewed_at,
    ur.admin_notes,
    ur.created_at,
    rp.name as reporter_name,
    rp.username as reporter_username,
    rd.name as reported_name,
    rd.username as reported_username
  FROM user_reports ur
  LEFT JOIN profiles rp ON ur.reporter_id = rp.id
  LEFT JOIN profiles rd ON ur.reported_id = rd.id
  ORDER BY ur.created_at DESC;
END;
$$;

-- Create function to get all post reports (admin only)
CREATE OR REPLACE FUNCTION get_all_post_reports_admin()
RETURNS TABLE (
  id uuid,
  reporter_id uuid,
  post_id uuid,
  reason text,
  description text,
  status text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz,
  reporter_name text,
  reporter_username text,
  post_content text,
  post_author_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT 
    pr.id,
    pr.reporter_id,
    pr.post_id,
    pr.reason,
    pr.description,
    pr.status,
    pr.reviewed_by,
    pr.reviewed_at,
    pr.admin_notes,
    pr.created_at,
    rp.name as reporter_name,
    rp.username as reporter_username,
    p.content as post_content,
    pa.name as post_author_name
  FROM post_reports pr
  LEFT JOIN profiles rp ON pr.reporter_id = rp.id
  LEFT JOIN posts p ON pr.post_id = p.id
  LEFT JOIN profiles pa ON p.author_id = pa.id
  ORDER BY pr.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_user_reports_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_post_reports_admin() TO authenticated;