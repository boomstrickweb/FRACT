/*
  # Create profile analyses table

  1. New Tables
    - `profile_analyses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `personality` (text)
      - `interests` (text)
      - `communication_style` (text)
      - `values` (text)
      - `overall_impression` (text)
      - `confidence_score` (integer)
      - `analyzed_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `profile_analyses` table
    - Add policies for reading and managing analyses
*/

CREATE TABLE IF NOT EXISTS profile_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  personality text NOT NULL,
  interests text NOT NULL,
  communication_style text NOT NULL,
  values text NOT NULL,
  overall_impression text NOT NULL,
  confidence_score integer NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  analyzed_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profile_analyses ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS profile_analyses_user_id_idx ON profile_analyses(user_id);
CREATE INDEX IF NOT EXISTS profile_analyses_analyzed_at_idx ON profile_analyses(analyzed_at DESC);

-- RLS Policies
CREATE POLICY "Anyone can read profile analyses"
  ON profile_analyses
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "System can manage profile analyses"
  ON profile_analyses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_profile_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_analyses_updated_at
  BEFORE UPDATE ON profile_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_analyses_updated_at();