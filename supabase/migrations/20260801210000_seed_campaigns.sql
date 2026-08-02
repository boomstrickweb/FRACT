-- Seed 5 campaigns
DO $$
DECLARE
  v_author_id uuid;
BEGIN
  -- Try to get the first profile
  SELECT id INTO v_author_id FROM profiles LIMIT 1;

  -- Only insert if we have a profile to link to
  IF v_author_id IS NOT NULL THEN
    INSERT INTO campaigns (author_id, title, summary, action_goal, category, region, is_reviewed)
    VALUES
      (v_author_id, 'Don''t Cut Trees', 'Protect forests from unnecessary deforestation and promote sustainable land management.', 'Protect urban forests.', 'Environment', 'Global', true),
      (v_author_id, 'Keep Open Source Open', 'Support the development, funding, and long-term sustainability of open-source software.', 'Support open-source software.', 'Technology', 'Global', true),
      (v_author_id, 'Protect Public Libraries', 'Encourage investment in public libraries and preserve free access to knowledge for everyone.', 'Keep libraries open.', 'Education', 'Global', true),
      (v_author_id, 'Defend Digital Privacy', 'Promote stronger privacy protections, transparent data practices, and user control over personal information.', 'Promote stronger privacy protections and transparent data practices.', 'Privacy', 'Global', true),
      (v_author_id, 'Protect Ocean Life', 'Support efforts to reduce marine pollution and protect ocean ecosystems and wildlife.', 'Reduce marine pollution and protect ocean ecosystems.', 'Environment', 'Global', true);
  END IF;
END $$;
