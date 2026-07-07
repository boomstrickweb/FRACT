/*
  # Create reflection_edit_history and reflection_reports tables

  ## Summary
  Adds full audit trail and reporting infrastructure for reflections, mirroring
  the existing post_edit_history and post_reports patterns.

  ## New Tables

  ### reflection_edit_history
  - Stores a snapshot of each version of a reflection before it is edited
  - `id` (uuid, pk)
  - `reflection_id` (uuid, fk -> reflections.id CASCADE)
  - `content` (text, nullable): text content at time of edit
  - `quote_signature` (text, nullable): signature for quote-type reflections
  - `reflection_type` (text): type at time of edit (text/quote/voice)
  - `is_explicit` (boolean): explicit flag at time of edit
  - `edited_at` (timestamptz): when this version was saved
  - `version_number` (int): sequential version counter

  ### reflection_reports
  - Records user reports against specific reflections
  - `id` (uuid, pk)
  - `reporter_id` (uuid, fk -> auth.users)
  - `reflection_id` (uuid, fk -> reflections.id CASCADE)
  - `reported_user_id` (uuid): author of the reported reflection
  - `reason` (text, NOT NULL): selected report reason
  - `description` (text, nullable): optional extra context
  - `status` (text): 'pending' | 'reviewed' | 'resolved', default 'pending'
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - reflection_edit_history: authenticated users can read any entry; only system (trigger) inserts
  - reflection_reports: reporters can insert and read their own reports; no public read

  ## Trigger
  - `snapshot_reflection_before_update` trigger: automatically saves a version snapshot
    into reflection_edit_history before any UPDATE on the reflections table
*/

CREATE TABLE IF NOT EXISTS reflection_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id uuid NOT NULL REFERENCES reflections(id) ON DELETE CASCADE,
  content text,
  quote_signature text,
  reflection_type text NOT NULL DEFAULT 'text',
  is_explicit boolean NOT NULL DEFAULT false,
  edited_at timestamptz NOT NULL DEFAULT now(),
  version_number integer NOT NULL DEFAULT 1
);

ALTER TABLE reflection_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reflection edit history"
  ON reflection_edit_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert reflection edit history"
  ON reflection_edit_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS reflection_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reflection_id uuid NOT NULL REFERENCES reflections(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reflection_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert reflection reports"
  ON reflection_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reflection reports"
  ON reflection_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE INDEX IF NOT EXISTS reflection_edit_history_reflection_id_idx
  ON reflection_edit_history(reflection_id);

CREATE INDEX IF NOT EXISTS reflection_reports_reflection_id_idx
  ON reflection_reports(reflection_id);

CREATE INDEX IF NOT EXISTS reflection_reports_reporter_id_idx
  ON reflection_reports(reporter_id);

CREATE OR REPLACE FUNCTION snapshot_reflection_on_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM reflection_edit_history
  WHERE reflection_id = OLD.id;

  INSERT INTO reflection_edit_history (
    reflection_id,
    content,
    quote_signature,
    reflection_type,
    is_explicit,
    edited_at,
    version_number
  ) VALUES (
    OLD.id,
    OLD.content,
    OLD.quote_signature,
    OLD.reflection_type,
    OLD.is_explicit,
    now(),
    v_next_version
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS snapshot_reflection_before_update ON reflections;

CREATE TRIGGER snapshot_reflection_before_update
  BEFORE UPDATE ON reflections
  FOR EACH ROW
  WHEN (
    OLD.content IS DISTINCT FROM NEW.content
    OR OLD.quote_signature IS DISTINCT FROM NEW.quote_signature
    OR OLD.is_explicit IS DISTINCT FROM NEW.is_explicit
  )
  EXECUTE FUNCTION snapshot_reflection_on_edit();
