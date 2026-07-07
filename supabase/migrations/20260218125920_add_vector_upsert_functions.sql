/*
  # Add Vector Upsert Helper Functions

  ## Summary
  Creates SQL functions callable via RPC to store pgvector embeddings.
  The Supabase JS client cannot cast text to vector type directly,
  so these functions handle the casting server-side.

  ## New Functions
  - `upsert_category_embedding(cat_id, vec_text)` — stores a category centroid vector
  - `upsert_post_embedding(p_id, vec_text, scores, primary_cat)` — stores a post embedding + category scores
*/

CREATE OR REPLACE FUNCTION upsert_category_embedding(
  cat_id text,
  vec_text text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE category_embeddings
    SET embedding = vec_text::vector,
        updated_at = now()
  WHERE category_id = cat_id;
END;
$$;

CREATE OR REPLACE FUNCTION upsert_post_embedding(
  p_id uuid,
  vec_text text,
  scores jsonb,
  primary_cat text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts
    SET embedding = vec_text::vector,
        category_scores = scores,
        primary_category = primary_cat
  WHERE id = p_id;
END;
$$;
