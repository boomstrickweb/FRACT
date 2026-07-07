/*
  # Add reflection type columns to reflections table

  ## Summary
  Extends the reflections table to support all three reflection types matching
  CreatePost: text (420 chars), quote (300 chars + 100 char signature), and
  voice (audio URL). Also adds anonymous posting and perspective lock fields.

  ## Changes to reflections table
  - `reflection_type` (text): 'text' | 'quote' | 'voice', defaults to 'text'
  - `quote_signature` (text, nullable): signature for quote reflections (max 100 chars)
  - `voice_url` (text, nullable): public URL of uploaded voice note
  - `is_anonymous` (boolean): hide author identity, defaults to false
  - `perspective_lock` (text, nullable): 'opinion' | 'question' | 'hypothesis' | 'personal_experience'
  - Makes `content` nullable to allow voice-only reflections

  ## Notes
  - Existing reflections default to type 'text' and keep their content
  - Voice reflections will have empty string content and a voice_url
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reflections' AND column_name = 'reflection_type'
  ) THEN
    ALTER TABLE reflections ADD COLUMN reflection_type text NOT NULL DEFAULT 'text'
      CHECK (reflection_type IN ('text', 'quote', 'voice'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reflections' AND column_name = 'quote_signature'
  ) THEN
    ALTER TABLE reflections ADD COLUMN quote_signature text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reflections' AND column_name = 'voice_url'
  ) THEN
    ALTER TABLE reflections ADD COLUMN voice_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reflections' AND column_name = 'is_anonymous'
  ) THEN
    ALTER TABLE reflections ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reflections' AND column_name = 'perspective_lock'
  ) THEN
    ALTER TABLE reflections ADD COLUMN perspective_lock text
      CHECK (perspective_lock IN ('opinion', 'question', 'hypothesis', 'personal_experience'));
  END IF;
END $$;

ALTER TABLE reflections ALTER COLUMN content DROP NOT NULL;
ALTER TABLE reflections ALTER COLUMN content SET DEFAULT '';
