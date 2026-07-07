/*
  # Add Post Sources and Rating System for Media Profiles

  ## Overview
  This migration adds source attribution and rating systems for media profile posts.
  Media profiles can either provide sources or declare the nature of their content.

  ## Changes to Existing Tables
  
  ### `posts` table modifications
  - Add `sources` (text array) - List of sources (URLs, citations) for the post
  - Add `source_type` (text) - Type of sourcing: 'sources', 'original_reporting', 'opinion_commentary', 'public_knowledge'
  - Add `source_description` (text) - Optional description for source type
  
  ## New Tables
  
  ### `post_ratings`
  - `id` (uuid, primary key)
  - `post_id` (uuid, foreign key to posts)
  - `user_id` (uuid, foreign key to profiles)
  - `rating` (integer) - Rating value from 1 to 5
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  Constraints:
  - Unique constraint on (post_id, user_id) - one rating per user per post
  - Check constraint to ensure rating is between 1 and 5
  - Post author cannot rate their own posts (enforced via RLS)

  ## Functions
  
  ### `calculate_post_average_rating(post_id)`
  - Calculates the average rating for a specific post
  - Returns decimal value
  
  ### `update_trust_score_from_ratings(user_id)`
  - Updates a user's trust score based on all their posts' average ratings
  - Called via trigger when ratings change

  ## Security
  - Enable RLS on `post_ratings` table
  - Users can insert/update/delete their own ratings
  - Users can read all ratings (but averages are hidden from UI)
  - Post authors cannot rate their own posts

  ## Notes
  - Media profiles must either provide 3-5 sources OR select a source type
  - Rating system affects trust score calculation
  - Post author and users cannot see individual or average ratings in UI
  - Trust score is calculated server-side based on all post ratings
*/

-- Add source-related columns to posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'sources'
  ) THEN
    ALTER TABLE posts ADD COLUMN sources text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE posts ADD COLUMN source_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'source_description'
  ) THEN
    ALTER TABLE posts ADD COLUMN source_description text;
  END IF;
END $$;

-- Create post_ratings table
CREATE TABLE IF NOT EXISTS post_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS on post_ratings
ALTER TABLE post_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_ratings

-- Users can view all ratings
CREATE POLICY "Users can view all ratings"
  ON post_ratings FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own ratings (but not for their own posts)
CREATE POLICY "Users can rate posts"
  ON post_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_ratings.post_id
      AND posts.author_id = auth.uid()
    )
  );

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings"
  ON post_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own ratings
CREATE POLICY "Users can delete own ratings"
  ON post_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to calculate average rating for a post
CREATE OR REPLACE FUNCTION calculate_post_average_rating(p_post_id uuid)
RETURNS decimal
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_rating decimal;
BEGIN
  SELECT AVG(rating)::decimal(3,2)
  INTO avg_rating
  FROM post_ratings
  WHERE post_id = p_post_id;
  
  RETURN COALESCE(avg_rating, 0);
END;
$$;

-- Create function to update trust score based on post ratings
CREATE OR REPLACE FUNCTION update_trust_score_from_ratings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_author_id uuid;
  new_trust_score integer;
BEGIN
  -- Get the post author
  SELECT author_id INTO post_author_id
  FROM posts
  WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  
  -- Calculate new trust score
  -- Formula: Average of all post ratings for this author, scaled to a score
  -- (Average rating - 3) * 20 = score range from -40 to +40
  -- Then add count bonus/penalty
  SELECT 
    ROUND(
      ((AVG(pr.rating) - 3) * 20) + 
      (COUNT(DISTINCT pr.post_id) * 2)
    )::integer
  INTO new_trust_score
  FROM posts p
  LEFT JOIN post_ratings pr ON pr.post_id = p.id
  WHERE p.author_id = post_author_id
    AND p.author_id IN (
      SELECT id FROM profiles WHERE profile_type = 'media'
    );
  
  -- Update the profile's trust score
  UPDATE profiles
  SET trust_score = COALESCE(new_trust_score, 0)
  WHERE id = post_author_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to update trust score when ratings change
DROP TRIGGER IF EXISTS update_trust_score_on_rating_change ON post_ratings;
CREATE TRIGGER update_trust_score_on_rating_change
  AFTER INSERT OR UPDATE OR DELETE ON post_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_trust_score_from_ratings();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_ratings_post_id ON post_ratings(post_id);
CREATE INDEX IF NOT EXISTS idx_post_ratings_user_id ON post_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id_source_type ON posts(author_id, source_type);
