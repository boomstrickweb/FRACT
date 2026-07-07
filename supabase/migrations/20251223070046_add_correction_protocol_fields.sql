/*
  # Add Correction Protocol Fields for Media Profiles

  ## Overview
  This migration adds fields to track correction notes for media profile post edits.
  Media profiles must document what was wrong and what was fixed when editing posts.

  ## Changes to Existing Tables
  
  ### `post_edit_history` table modifications
  - Add `what_was_wrong` (text) - Description of the error or issue being corrected
  - Add `what_got_fixed` (text) - Description of the correction made
  
  These fields are required for media profile edits, optional for regular users.

  ## Notes
  - Media profiles must provide both correction notes when editing
  - Correction notes are publicly visible to all users
  - Regular users can still edit without correction notes (backward compatible)
  - This supports media accountability and transparency
*/

-- Add correction protocol fields to post_edit_history table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'post_edit_history' AND column_name = 'what_was_wrong'
  ) THEN
    ALTER TABLE post_edit_history ADD COLUMN what_was_wrong text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'post_edit_history' AND column_name = 'what_got_fixed'
  ) THEN
    ALTER TABLE post_edit_history ADD COLUMN what_got_fixed text;
  END IF;
END $$;

-- Create index for querying correction history
CREATE INDEX IF NOT EXISTS idx_post_edit_history_corrections ON post_edit_history(post_id, edited_at DESC) 
  WHERE what_was_wrong IS NOT NULL AND what_got_fixed IS NOT NULL;
