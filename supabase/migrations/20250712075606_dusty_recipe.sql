/*
  # Add foreign key constraint for posts reply relationship

  1. Changes
    - Add foreign key constraint `posts_reply_to_post_id_fkey` to link `reply_to_post_id` column to `id` column in the same `posts` table
    - This enables self-referencing relationships for post replies
    - Uses CASCADE delete to maintain data integrity

  2. Security
    - No RLS changes needed as this only adds a constraint
*/

-- Add foreign key constraint for reply_to_post_id to reference posts.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'posts_reply_to_post_id_fkey' 
    AND table_name = 'posts'
  ) THEN
    ALTER TABLE public.posts 
    ADD CONSTRAINT posts_reply_to_post_id_fkey 
    FOREIGN KEY (reply_to_post_id) 
    REFERENCES public.posts(id) 
    ON DELETE CASCADE;
  END IF;
END $$;