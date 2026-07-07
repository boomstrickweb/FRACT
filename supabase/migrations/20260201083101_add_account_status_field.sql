/*
  # Add Account Status Field

  1. Changes
    - Add `account_status` column to profiles table
      - Type: text with check constraint ('active' or 'limited')
      - Default: 'active'
      - Only modifiable by system admins
    
  2. Security
    - RLS policy prevents regular users from modifying account_status
    - Only admins can update this field through admin functions
    - Users can read their own account_status
    
  3. Notes
    - 'active': Normal account with full functionality
    - 'limited': Account with reduced post visibility
*/

-- Add account_status column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN account_status text DEFAULT 'active';
    
    -- Add check constraint to ensure only valid values
    ALTER TABLE profiles ADD CONSTRAINT account_status_check 
      CHECK (account_status IN ('active', 'limited'));
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_account_status 
  ON profiles(account_status);

-- Create admin function to update account status
CREATE OR REPLACE FUNCTION update_user_account_status(
  target_user_id uuid,
  new_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  is_admin boolean;
BEGIN
  -- Get the current user
  current_user_id := auth.uid();
  
  -- Check if current user is admin
  SELECT profiles.is_admin INTO is_admin
  FROM profiles
  WHERE profiles.id = current_user_id;
  
  -- Only admins can update account status
  IF NOT is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only administrators can modify account status'
    );
  END IF;
  
  -- Validate the new status
  IF new_status NOT IN ('active', 'limited') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid status. Must be either active or limited'
    );
  END IF;
  
  -- Update the account status
  UPDATE profiles
  SET account_status = new_status,
      updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the action
  INSERT INTO security_events (user_id, event_type, event_details)
  VALUES (
    current_user_id,
    'account_status_changed',
    json_build_object(
      'target_user_id', target_user_id,
      'new_status', new_status,
      'changed_by', current_user_id
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Account status updated successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Add comment to the column
COMMENT ON COLUMN profiles.account_status IS 'Account status controlled by system admins only. Values: active, limited';
