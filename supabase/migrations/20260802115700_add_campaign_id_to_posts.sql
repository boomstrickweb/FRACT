DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE posts ADD COLUMN campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster lookups of posts by campaign
CREATE INDEX IF NOT EXISTS idx_posts_campaign_id ON posts(campaign_id);
