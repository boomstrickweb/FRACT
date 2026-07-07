/*
  # Remove Vector Mapping Logic

  ## Summary
  Deletes all infrastructure related to vector-based category mapping,
  as we are switching to Text Classification.

  ## Changes
  - Drops `category_embeddings` table
  - Removes `embedding`, `category_scores`, and `primary_category` columns from `posts` table
  - Drops RPC functions: `upsert_category_embedding`, `upsert_post_embedding`, `match_post_categories`, `get_posts_by_category_filter`
*/

-- Drop functions
DROP FUNCTION IF EXISTS upsert_category_embedding(text, text);
DROP FUNCTION IF EXISTS upsert_post_embedding(uuid, text, jsonb, text);
DROP FUNCTION IF EXISTS match_post_categories(uuid);
DROP FUNCTION IF EXISTS get_posts_by_category_filter(uuid, boolean, text[], text[]);

-- Drop table
DROP TABLE IF EXISTS category_embeddings;

-- Remove columns from posts
ALTER TABLE posts 
DROP COLUMN IF EXISTS embedding,
DROP COLUMN IF EXISTS category_scores,
DROP COLUMN IF EXISTS primary_category;
