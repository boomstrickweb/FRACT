/*
  # Add AI Detection Score Column

  1. Modified Tables
    - `posts`
      - `ai_detection_score` (integer, 0-100) - Stores the numeric AI detection confidence score
    - `post_series`
      - `ai_detection_score` (integer, 0-100) - Stores the numeric AI detection confidence score

  2. Notes
    - Score ranges from 0 (definitely human) to 100 (definitely AI)
    - Score is stored even when below the 75 threshold for transparency
    - Used to display confidence level in the UI tooltip
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'ai_detection_score'
  ) THEN
    ALTER TABLE posts ADD COLUMN ai_detection_score integer CHECK (ai_detection_score >= 0 AND ai_detection_score <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'post_series' AND column_name = 'ai_detection_score'
  ) THEN
    ALTER TABLE post_series ADD COLUMN ai_detection_score integer CHECK (ai_detection_score >= 0 AND ai_detection_score <= 100);
  END IF;
END $$;
