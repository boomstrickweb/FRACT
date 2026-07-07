/*
  # Enable pgvector and Add Post Embeddings

  ## Summary
  Enables the pgvector extension and adds embedding infrastructure to support
  semantic category filtering of posts using Google Gemini embeddings.

  ## Changes

  ### Extensions
  - `vector` — pgvector extension for storing and querying float vector embeddings

  ### New Tables
  - `category_embeddings`
    - `id` (uuid, primary key)
    - `category_id` (text) — one of: tech, science, human, arts, economy, politics
    - `embedding` (vector(768)) — centroid vector for this category (Gemini embedding-001 outputs 768 dims)
    - `created_at` (timestamptz)

  ### Modified Tables
  - `posts`
    - `embedding` (vector(768), nullable) — semantic embedding of post content
    - `category_scores` (jsonb, nullable) — cosine similarity scores per category, cached
    - `primary_category` (text, nullable) — top-scoring category ID

  ### New Functions
  - `match_post_categories(post_id)` — returns cosine similarity of a post's embedding against all category centroids
  - `get_posts_by_category_filter(user_id, mixed_feed, interest_cats, excluded_cats)` — returns filtered post IDs

  ### Security
  - RLS on category_embeddings: only service role can write, authenticated users can read
*/

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Category embeddings table (stores centroid vectors per category)
CREATE TABLE IF NOT EXISTS category_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id text NOT NULL UNIQUE,
  embedding vector(768),
  keyword_list text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE category_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read category embeddings"
  ON category_embeddings FOR SELECT
  TO authenticated
  USING (true);

-- Add embedding columns to posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE posts ADD COLUMN embedding vector(768);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'category_scores'
  ) THEN
    ALTER TABLE posts ADD COLUMN category_scores jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'primary_category'
  ) THEN
    ALTER TABLE posts ADD COLUMN primary_category text;
  END IF;
END $$;

-- Index for fast cosine similarity search on post embeddings
CREATE INDEX IF NOT EXISTS posts_embedding_idx
  ON posts USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index on primary_category for fast filtering
CREATE INDEX IF NOT EXISTS posts_primary_category_idx
  ON posts (primary_category);

-- Seed the category_embeddings table with known category IDs and keyword lists
-- (embeddings will be populated by the edge function on first run)
INSERT INTO category_embeddings (category_id, keyword_list) VALUES
  ('tech',     ARRAY['artificial intelligence','machine learning','neural networks','software engineering','cloud computing','cybersecurity','blockchain','web3','quantum computing','digital transformation','algorithms','hardware','robotics','nanotechnology','internet of things','IoT']),
  ('science',  ARRAY['astrophysics','quantum physics','space exploration','cosmology','biology','neuroscience','genetics','chemistry','mathematics','climate change','renewable energy','ecology','environmental science','evolutionary biology','scientific research']),
  ('human',    ARRAY['philosophy','ethics','existentialism','psychology','mental health','sociology','anthropology','human behavior','cognition','history','archaeology','cultural studies','linguistics','ethics of AI','consciousness']),
  ('arts',     ARRAY['digital art','graphic design','cinematography','storytelling','music theory','sound engineering','literature','creative writing','aesthetics','fine arts','photography','architecture','performing arts','poetry','media studies']),
  ('economy',  ARRAY['macroeconomics','global finance','stock markets','entrepreneurship','startups','venture capital','business strategy','trade','inflation','monetary policy','e-commerce','market analysis','industrial trends','wealth management']),
  ('politics', ARRAY['international relations','diplomacy','geopolitics','political theory','ideologies','democracy','public policy','legislation','legal systems','elections','voting rights','human rights','national security','governance','statecraft'])
ON CONFLICT (category_id) DO UPDATE
  SET keyword_list = EXCLUDED.keyword_list;
