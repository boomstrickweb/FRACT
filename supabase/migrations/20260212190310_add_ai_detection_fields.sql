/*
  # Add AI Content Detection Fields

  1. Modified Tables
    - `posts`
      - `ai_flagged` (text, nullable) - AI detection result: 'ai_assisted', 'ai_generated', or null
      - `ai_flag_source` (text, nullable) - Who flagged it: 'user' (self-labeled) or 'system' (auto-detected)
    - `post_series`
      - `ai_flagged` (text, nullable) - Same as above
      - `ai_flag_source` (text, nullable) - Same as above

  2. Notes
    - ai_flagged is null when no AI involvement detected
    - ai_flag_source tracks whether the label came from the author or automated detection
    - These columns are updated in the background after post creation
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'ai_flagged'
  ) THEN
    ALTER TABLE posts ADD COLUMN ai_flagged text CHECK (ai_flagged IN ('ai_assisted', 'ai_generated'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'ai_flag_source'
  ) THEN
    ALTER TABLE posts ADD COLUMN ai_flag_source text CHECK (ai_flag_source IN ('user', 'system'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'post_series' AND column_name = 'ai_flagged'
  ) THEN
    ALTER TABLE post_series ADD COLUMN ai_flagged text CHECK (ai_flagged IN ('ai_assisted', 'ai_generated'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'post_series' AND column_name = 'ai_flag_source'
  ) THEN
    ALTER TABLE post_series ADD COLUMN ai_flag_source text CHECK (ai_flag_source IN ('user', 'system'));
  END IF;
END $$;
