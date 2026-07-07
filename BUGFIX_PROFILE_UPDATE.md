# Profile Update Bug Fix

## Issue
Users were unable to update their profiles, receiving the error:
```
Error updating profile. Please try again.
infinite recursion detected in policy for relation "profiles"
```

## Root Cause

### The Problem
The "Users can update own profile (restricted)" RLS policy on the `profiles` table contained a circular reference in its `WITH CHECK` clause:

```sql
CREATE POLICY "Users can update own profile (restricted)"
  ON profiles
  FOR UPDATE
  WITH CHECK (
    auth.uid() = id
    AND (is_verified IS NOT DISTINCT FROM
         (SELECT is_verified FROM profiles WHERE id = auth.uid()))
    AND (verification_type IS NOT DISTINCT FROM
         (SELECT verification_type FROM profiles WHERE id = auth.uid()))
    -- ... more SELECT queries from profiles
  );
```

### Why This Caused Infinite Recursion
1. User attempts to UPDATE their profile
2. RLS evaluates the UPDATE policy's `WITH CHECK` clause
3. The `WITH CHECK` clause runs `SELECT ... FROM profiles WHERE id = auth.uid()`
4. This SELECT triggers RLS policies on profiles
5. Which then needs to evaluate the UPDATE policy again (because it's checking the same row)
6. Loop continues infinitely → PostgreSQL detects this and raises error

### Additional Issues
The anti-spam tables had overly permissive policies:
```sql
CREATE POLICY "System manages rate limits"
  ON post_rate_limits FOR ALL
  USING (true) WITH CHECK (true);
```

These policies allowed any authenticated user to modify anti-spam data, which was both insecure and could contribute to policy evaluation issues.

## Solution

### 1. Replace Policy WITH CHECK with Trigger
Instead of using a recursive `WITH CHECK` clause, we now use a `BEFORE UPDATE` trigger:

```sql
-- Simple policy without recursive SELECT
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger function to protect specific fields
CREATE FUNCTION protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if protected fields are being modified
  IF OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
    RAISE EXCEPTION 'Cannot modify is_verified field';
  END IF;
  -- ... similar checks for other protected fields
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_protect_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_fields();
```

### 2. Admin Function Bypass
Admin functions can bypass the protection using a configuration variable:

```sql
-- In admin functions, before updating protected fields:
PERFORM set_config('app.bypass_profile_protection', 'true', true);

-- Trigger checks this flag:
IF current_setting('app.bypass_profile_protection', true) = 'true' THEN
  RETURN NEW; -- Allow update
END IF;
```

### 3. Remove Overly Permissive Anti-Spam Policies
Removed the "System manages" policies from anti-spam tables:
- `post_rate_limits`
- `post_fingerprints`
- `spam_violations`

Now these tables only allow users to SELECT their own data, and all modifications must go through SECURITY DEFINER functions.

## Benefits

### No More Infinite Recursion
✅ Trigger runs BEFORE RLS evaluation
✅ No circular policy references
✅ Clear separation of concerns

### Better Security
✅ Protected fields still cannot be modified by users
✅ Clear error messages when attempting to modify protected fields
✅ Admin functions explicitly bypass protection
✅ No overly permissive policies

### Better Performance
✅ No recursive SELECT queries during updates
✅ Simpler policy evaluation
✅ Trigger only runs on actual updates

### Maintainability
✅ Easier to understand (trigger vs. complex policy)
✅ Easier to debug (clear error messages)
✅ Easier to extend (add more protected fields)

## Protected Fields

The following fields cannot be modified by regular users:
1. `is_verified` - Verification status (admin/system only)
2. `verification_type` - Type of verification (admin/system only)
3. `verification_reason` - Reason for verification (admin/system only)
4. `trust_score` - User reputation score (admin/system only)
5. `password_hash` - Password (must use auth system)

## Testing

### Test Case 1: Normal Profile Update
```typescript
// User updates their bio
await supabase
  .from('profiles')
  .update({ bio: 'New bio' })
  .eq('id', userId);
// ✅ Success
```

### Test Case 2: Attempt to Modify Protected Field
```typescript
// User tries to verify themselves
await supabase
  .from('profiles')
  .update({ is_verified: true })
  .eq('id', userId);
// ❌ Error: "Cannot modify is_verified field"
```

### Test Case 3: Admin Function
```sql
-- Admin verifies a user
SELECT admin_set_user_verification(
  'user-uuid',
  true,
  'manual',
  'Verified by admin'
);
-- ✅ Success (bypass protection enabled)
```

## Files Modified

### Database Migrations
1. `remove_permissive_anti_spam_policies.sql`
   - Removed overly permissive policies from anti-spam tables
   - Kept read-only policies for users

2. `fix_profile_update_infinite_recursion.sql`
   - Replaced recursive policy with simple policy
   - Added trigger-based protection
   - Implemented bypass mechanism

3. `update_admin_functions_bypass_protection.sql`
   - Updated admin functions to set bypass flag
   - Ensured protected fields can still be modified by admins

## Verification

✅ Build successful
✅ No infinite recursion errors
✅ Users can update their profiles
✅ Protected fields still protected
✅ Admin functions still work
✅ Anti-spam system still enforces rules

## Summary

The infinite recursion bug was caused by a RLS policy that queried the same table it was protecting, creating a circular reference. This was fixed by:

1. **Replacing the recursive WITH CHECK clause with a trigger** - Triggers run before RLS, preventing recursion
2. **Removing overly permissive anti-spam policies** - Better security and cleaner policy evaluation
3. **Implementing bypass mechanism for admin functions** - Admins can still modify protected fields

The solution maintains all security guarantees while eliminating the infinite recursion issue and improving overall system performance.

---

**Fixed:** January 20, 2025
**Status:** ✅ Resolved
