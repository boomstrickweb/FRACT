/*
  # Fix Vector Dimensions to 3072

  ## Summary
  Corrects embedding column sizes to match gemini-embedding-001 output (3072 dims).
  Category filtering uses pre-computed category_scores jsonb and primary_category text,
  so no ANN index on the raw vector column is needed at query time.

  ## Changes
  - `category_embeddings.embedding` — vector(3072)
  - `posts.embedding` — vector(3072)
*/

ALTER TABLE category_embeddings
  ALTER COLUMN embedding TYPE vector(3072)
  USING NULL::vector(3072);

ALTER TABLE posts
  ALTER COLUMN embedding TYPE vector(3072)
  USING NULL::vector(3072);
