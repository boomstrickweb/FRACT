/*
  # Introduce Text Classification Logic

  ## Summary
  Introduces the database infrastructure for AI-based Text Classification.
  This replaces the old vector mapping logic.

  ## Changes
  - Adds `classification_label` (text) to `posts` table
  - Adds `classification_confidence` (float) to `posts` table
  - Adds `classification_data` (jsonb) to `posts` table for detailed AI breakdown
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'classification_label'
  ) THEN
    ALTER TABLE posts ADD COLUMN classification_label text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'classification_confidence'
  ) THEN
    ALTER TABLE posts ADD COLUMN classification_confidence float;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'classification_data'
  ) THEN
    ALTER TABLE posts ADD COLUMN classification_data jsonb;
  END IF;
END $$;

-- Index for fast filtering by classification
CREATE INDEX IF NOT EXISTS posts_classification_label_idx ON posts (classification_label);
