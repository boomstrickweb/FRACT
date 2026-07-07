/*
  # Add Poll to Post Type Enum

  1. Changes
    - Add 'poll' value to post_type enum

  2. Safety
    - Using ALTER TYPE to add new value to existing enum
    - New value won't affect existing posts
*/

ALTER TYPE post_type ADD VALUE 'poll' AFTER 'voice';
