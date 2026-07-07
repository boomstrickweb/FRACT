/*
  # Create Post Series System

  1. New Tables
    - `post_series`
      - `id` (uuid, primary key)
      - `author_id` (uuid, references profiles)
      - `title` (text) - the name of the series
      - `is_anonymous` (boolean, default false)
      - `is_explicit` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `series_chapters`
      - `id` (uuid, primary key)
      - `series_id` (uuid, references post_series)
      - `chapter_number` (integer, 1-12)
      - `title` (text, nullable) - optional chapter title
      - `content` (text) - chapter content (420 chars)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Authors can CRUD their own series
    - All authenticated users can read series
    - Chapters inherit access from their parent series
*/

-- Create post_series table
CREATE TABLE IF NOT EXISTS post_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  is_explicit boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE post_series ENABLE ROW LEVEL SECURITY;

-- Create series_chapters table
CREATE TABLE IF NOT EXISTS series_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES post_series(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL,
  title text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT chapter_number_range CHECK (chapter_number >= 1 AND chapter_number <= 12),
  CONSTRAINT unique_chapter_per_series UNIQUE (series_id, chapter_number)
);

ALTER TABLE series_chapters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_series

CREATE POLICY "Authenticated users can read all series"
  ON post_series
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own series"
  ON post_series
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own series"
  ON post_series
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own series"
  ON post_series
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- RLS Policies for series_chapters

CREATE POLICY "Authenticated users can read all chapters"
  ON series_chapters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM post_series
      WHERE post_series.id = series_chapters.series_id
    )
  );

CREATE POLICY "Users can insert chapters to own series"
  ON series_chapters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM post_series
      WHERE post_series.id = series_chapters.series_id
      AND post_series.author_id = auth.uid()
    )
  );

CREATE POLICY "Users can update chapters of own series"
  ON series_chapters
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM post_series
      WHERE post_series.id = series_chapters.series_id
      AND post_series.author_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM post_series
      WHERE post_series.id = series_chapters.series_id
      AND post_series.author_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chapters of own series"
  ON series_chapters
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM post_series
      WHERE post_series.id = series_chapters.series_id
      AND post_series.author_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_series_author_id ON post_series(author_id);
CREATE INDEX IF NOT EXISTS idx_post_series_created_at ON post_series(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_series_chapters_series_id ON series_chapters(series_id);
CREATE INDEX IF NOT EXISTS idx_series_chapters_ordering ON series_chapters(series_id, chapter_number);
