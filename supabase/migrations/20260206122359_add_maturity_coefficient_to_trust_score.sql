/*
  # Add Time-Weighted Authority (Maturity Coefficient) to Trust Score

  ## Overview
  Replaces the simple average-based trust score calculation with a 
  Time-Weighted Authority algorithm. Each rater's vote is multiplied 
  by a weight based on how long they have been on the platform.

  ## Maturity Tiers
  - 0-7 days (Novice): 0.1x weight
  - 8-30 days (New Member): 0.5x weight (smooth ramp)
  - 1-6 months (Active Resident): 1.0x weight
  - 6-12 months (Veteran): 2.0x weight
  - 1 year+ (Founding Citizen): 3.0x weight

  ## New Functions

  ### `get_maturity_weight(user_uuid)`
  - Returns the maturity coefficient for a given user based on account age
  - Uses profiles.created_at to calculate days since registration

  ### `update_trust_score_from_ratings()` (REPLACED)
  - Now applies maturity-weighted average instead of simple average
  - Formula: weighted_avg = SUM(rating * weight) / SUM(weight)
  - Final score: ROUND((weighted_avg - 3) * 20) + (rated_post_count * 2)
  - Each rater's vote counts proportionally to their maturity tier

  ## Security
  - Both functions are SECURITY DEFINER to access profile data
  - No new tables or RLS changes needed

  ## Notes
  - Spam accounts (< 7 days old) have their votes reduced to 10% power
  - Thousands of new spam accounts are equivalent to a few real users
  - Existing trust scores will be recalculated on next rating event
*/

-- Function to get maturity weight for a user
CREATE OR REPLACE FUNCTION get_maturity_weight(user_uuid uuid)
RETURNS decimal
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  account_age_days integer;
  weight decimal;
BEGIN
  SELECT EXTRACT(DAY FROM (now() - created_at))::integer
  INTO account_age_days
  FROM profiles
  WHERE id = user_uuid;

  IF account_age_days IS NULL THEN
    RETURN 0.1;
  END IF;

  IF account_age_days <= 7 THEN
    weight := 0.1;
  ELSIF account_age_days <= 30 THEN
    weight := 0.5;
  ELSIF account_age_days <= 180 THEN
    weight := 1.0;
  ELSIF account_age_days <= 365 THEN
    weight := 2.0;
  ELSE
    weight := 3.0;
  END IF;

  RETURN weight;
END;
$$;

-- Replace trust score calculation with maturity-weighted version
CREATE OR REPLACE FUNCTION update_trust_score_from_ratings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_author_id uuid;
  new_trust_score integer;
  is_media boolean;
BEGIN
  SELECT author_id INTO post_author_id
  FROM posts
  WHERE id = COALESCE(NEW.post_id, OLD.post_id);

  SELECT (profile_type = 'media') INTO is_media
  FROM profiles
  WHERE id = post_author_id;

  IF NOT COALESCE(is_media, false) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    ROUND(
      (
        (SUM(pr.rating * get_maturity_weight(pr.user_id)) / NULLIF(SUM(get_maturity_weight(pr.user_id)), 0)) - 3
      ) * 20
      + (COUNT(DISTINCT pr.post_id) * 2)
    )::integer
  INTO new_trust_score
  FROM posts p
  JOIN post_ratings pr ON pr.post_id = p.id
  WHERE p.author_id = post_author_id;

  UPDATE profiles
  SET trust_score = COALESCE(new_trust_score, 0)
  WHERE id = post_author_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Helper: recalculate trust score on demand for a specific media profile
CREATE OR REPLACE FUNCTION recalculate_trust_score(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_trust_score integer;
  is_media boolean;
BEGIN
  SELECT (profile_type = 'media') INTO is_media
  FROM profiles
  WHERE id = target_user_id;

  IF NOT COALESCE(is_media, false) THEN
    RETURN 0;
  END IF;

  SELECT
    ROUND(
      (
        (SUM(pr.rating * get_maturity_weight(pr.user_id)) / NULLIF(SUM(get_maturity_weight(pr.user_id)), 0)) - 3
      ) * 20
      + (COUNT(DISTINCT pr.post_id) * 2)
    )::integer
  INTO new_trust_score
  FROM posts p
  JOIN post_ratings pr ON pr.post_id = p.id
  WHERE p.author_id = target_user_id;

  UPDATE profiles
  SET trust_score = COALESCE(new_trust_score, 0)
  WHERE id = target_user_id;

  RETURN COALESCE(new_trust_score, 0);
END;
$$;