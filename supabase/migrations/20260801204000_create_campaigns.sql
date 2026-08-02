-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) <= 80),
  summary text NOT NULL,
  action_goal text NOT NULL,
  category text NOT NULL,
  region text NOT NULL,
  is_reviewed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Campaigns are viewable by everyone"
  ON campaigns FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own pending campaigns"
  ON campaigns FOR UPDATE
  USING (auth.uid() = author_id AND is_reviewed = false);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
