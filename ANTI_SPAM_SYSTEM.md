# Anti-Spam System Documentation

## Overview
The FRACT application implements a comprehensive, backend-enforced anti-spam system to prevent spam, duplicates, and abuse. This system operates at the database level with multiple layers of protection that **cannot be bypassed** from the client side.

## System Architecture

### 🔒 Multi-Layer Protection

1. **Client-Side Pre-checks** (First Line)
   - User-friendly error messages
   - Immediate feedback
   - Prevents unnecessary requests

2. **Backend Functions** (Second Line)
   - Rate limit validation
   - Duplicate detection
   - Account age verification

3. **Database Trigger** (Final Firewall)
   - BEFORE INSERT trigger on posts table
   - Cannot be bypassed
   - Absolute enforcement layer

## Rate Limiting Rules

### Account Age-Based Limits

#### New Accounts (< 24 hours old)
- **Cooldown**: 1 post per 2 minutes (120 seconds)
- **Daily Limit**: 10 posts per 24 hours
- **Burst Limit**: 3 posts, then 4-minute cooldown
- **Purpose**: Prevent spam from new accounts

#### Young Accounts (1-7 days old)
- **Cooldown**: 1 post per 60 seconds
- **Daily Limit**: 30 posts per 24 hours
- **Burst Limit**: 5 posts, then 3-minute cooldown
- **Purpose**: Allow established users more freedom while maintaining control

#### Normal Accounts (≥ 7 days old)
- **Cooldown**: 1 post per 30 seconds
- **Daily Limit**: 100 posts per 24 hours
- **Burst Limit**: 5 posts, then 2-minute cooldown
- **Purpose**: Full freedom for trusted users

### Burst Protection
After reaching the burst limit (3-5 posts depending on account age), users face an extended cooldown:
- New accounts: 4 minutes
- Young accounts: 3 minutes
- Normal accounts: 2 minutes

## Duplicate Detection

### Content Fingerprinting
- Uses MD5 hash of normalized content
- Normalization: lowercase, trim, whitespace collapse
- Creates consistent fingerprint regardless of formatting

### Detection Rules

#### 1st Duplicate Attempt (within 24 hours)
- **Action**: Block with warning
- **Message**: "Duplicate detected. You have already posted this content in the last 24 hours."
- **Penalty**: None (warning only)

#### 2nd Duplicate Attempt (within 24 hours)
- **Action**: Block with strong warning
- **Message**: "Duplicate post detected. This is your final warning. One more duplicate will result in a 24-hour posting ban."
- **Penalty**: Final warning recorded

#### 3rd Duplicate Attempt (within 24 hours)
- **Action**: 24-hour posting ban
- **Message**: "You have been temporarily banned from posting for 24 hours due to repeated duplicate posts."
- **Penalty**: Complete posting ban for 24 hours

### Fingerprint Cleanup
- Fingerprints automatically deleted after 24 hours
- Users can repost the same content after 24-hour window

## Database Structure

### Tables

#### `post_rate_limits`
Tracks user posting activity and enforces rate limits.

**Columns:**
- `id` - UUID primary key
- `user_id` - Reference to profiles table
- `posts_in_burst` - Count of posts in current burst window
- `posts_today` - Total posts in last 24 hours
- `last_post_at` - Timestamp of last post
- `burst_started_at` - When current burst window started
- `cooldown_until` - When user can post again
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

**Purpose:** Tracks all rate limiting counters and cooldown timers.

#### `post_fingerprints`
Stores content fingerprints for duplicate detection.

**Columns:**
- `id` - UUID primary key
- `user_id` - Reference to profiles table
- `content_hash` - MD5 hash of normalized content
- `post_id` - Reference to posts table
- `created_at` - Timestamp

**Purpose:** Enables duplicate detection within 24-hour windows.

**Cleanup:** Records older than 24 hours are automatically deleted.

#### `spam_violations`
Records spam violations and penalties.

**Columns:**
- `id` - UUID primary key
- `user_id` - Reference to profiles table
- `violation_type` - Type of violation (e.g., 'duplicate_post')
- `violation_details` - JSON details about the violation
- `penalty_applied` - Type of penalty (e.g., '24h_posting_ban')
- `penalty_until` - When penalty expires
- `created_at` - Timestamp

**Purpose:** Tracks violations and enforces penalties.

### Functions

#### `generate_content_fingerprint(content text) → text`
- Normalizes and hashes content
- Returns MD5 hash for consistent fingerprinting
- Case-insensitive, whitespace-normalized

#### `check_duplicate_post(user_id, content) → jsonb`
- Checks if content is duplicate within 24 hours
- Returns allowed status and appropriate message
- Applies escalating penalties (warning → final warning → ban)

#### `calculate_post_cooldown(user_id) → jsonb`
- Determines cooldown settings based on account age
- Returns cooldown seconds, daily limit, burst limit
- Automatically adjusts as account ages

#### `check_post_rate_limit(user_id) → jsonb`
- Main rate limiting validation function
- Checks daily limits, cooldowns, burst limits, and bans
- Returns detailed status with retry information

#### `record_post_attempt(user_id, post_id, content) → void`
- Records successful post creation
- Updates rate limit counters
- Stores content fingerprint
- Logs security event

#### `enforce_anti_spam_rules() → trigger`
- Database trigger function (BEFORE INSERT)
- **Cannot be bypassed from client**
- Validates all rules before allowing post creation
- Raises exception if any rule is violated

#### `schedule_anti_spam_cleanup() → void`
- Cleanup function for maintenance
- Deletes old fingerprints (> 24 hours)
- Removes expired penalties
- Resets inactive rate limits

## Security Features

### 🛡️ No Client-Side Bypass Possible

1. **Database Trigger Enforcement**
   - Runs at database level
   - Cannot be disabled from client
   - Validates every insert operation
   - Uses SECURITY DEFINER (elevated privileges)

2. **Rate Limit Tracking**
   - All counters stored in database
   - Client cannot manipulate counters
   - Automatic reset based on time windows

3. **Duplicate Detection**
   - Server-side fingerprinting
   - Client cannot fake fingerprints
   - Database enforces uniqueness checks

4. **Penalty System**
   - Backend-managed penalties
   - Client cannot clear penalties
   - Time-based automatic expiration

### 🔐 Additional Protections

1. **Security Event Logging**
   - All blocked posts logged
   - Violation patterns tracked
   - Audit trail maintained

2. **RLS Policies**
   - Users can only view own data
   - System manages all records
   - No unauthorized access

3. **Index Optimization**
   - Fast duplicate lookups
   - Efficient rate limit checks
   - Minimal performance impact

## Implementation Details

### Client-Side Integration

**Location:** `src/components/CreatePost.tsx`

```typescript
// Pre-check rate limits
const rateLimitCheck = await checkPostRateLimit(user.id);
if (!rateLimitCheck.allowed) {
  setError(formatRetryMessage(rateLimitCheck));
  return;
}

// Check for duplicates
const duplicateCheck = await checkDuplicatePost(user.id, content);
if (!duplicateCheck.allowed) {
  setError(duplicateCheck.message);
  return;
}

// After successful post creation
await recordPostAttempt(user.id, newPost.id, content);
```

### Database Trigger

**Location:** Database migration `add_anti_spam_trigger_firewall.sql`

```sql
CREATE TRIGGER trigger_enforce_anti_spam
  BEFORE INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION enforce_anti_spam_rules();
```

**Effect:** Every post creation attempt is validated by the database, regardless of how the insert is initiated.

## Error Messages

### Rate Limit Errors
- "Please wait X seconds between posts."
- "You have posted N times in quick succession. Please wait X seconds."
- "Daily posting limit reached (N posts). Try again tomorrow."
- "You are temporarily banned from posting due to spam violations."

### Duplicate Errors
- "Duplicate detected. You have already posted this content in the last 24 hours."
- "Duplicate post detected. This is your final warning."
- "You have been temporarily banned from posting for 24 hours due to repeated duplicate posts."

## Testing Scenarios

### Test Case 1: Burst Posting
1. Create new account
2. Attempt to post 4 times rapidly
3. **Expected**: 3 posts succeed, 4th blocked with burst limit message

### Test Case 2: Duplicate Content
1. Post content: "This is a test"
2. Immediately try to post same content
3. **Expected**: First warning message
4. Try again
5. **Expected**: Final warning message
6. Try third time
7. **Expected**: 24-hour ban

### Test Case 3: Daily Limit
1. Use new account (< 24 hours)
2. Create 10 posts (respecting cooldowns)
3. Attempt 11th post
4. **Expected**: Daily limit reached message

### Test Case 4: Account Age Progression
1. Check cooldown for new account: 120 seconds
2. Wait until account is 1 day old
3. Check cooldown: 60 seconds
4. Wait until account is 7 days old
5. Check cooldown: 30 seconds

## Maintenance

### Automatic Cleanup
Run periodically (recommended: every 6 hours):

```sql
SELECT schedule_anti_spam_cleanup();
```

**Actions:**
- Removes fingerprints older than 24 hours
- Deletes expired penalties
- Resets inactive rate limits
- Logs cleanup completion

### Manual Cleanup
Can be run anytime without impact:

```sql
-- Clean fingerprints
DELETE FROM post_fingerprints WHERE created_at < now() - interval '24 hours';

-- Clean expired penalties
DELETE FROM spam_violations
WHERE penalty_until < now() AND created_at < now() - interval '30 days';

-- Reset rate limits
DELETE FROM post_rate_limits WHERE last_post_at < now() - interval '24 hours';
```

## Monitoring

### Track Spam Attempts
```sql
-- View recent blocked posts
SELECT
  user_id,
  event_type,
  event_details,
  created_at
FROM security_events
WHERE event_type IN ('post_blocked_rate_limit', 'post_blocked_duplicate')
ORDER BY created_at DESC
LIMIT 100;
```

### Track Violations
```sql
-- View recent violations
SELECT
  user_id,
  violation_type,
  penalty_applied,
  penalty_until,
  created_at
FROM spam_violations
ORDER BY created_at DESC
LIMIT 50;
```

### Check User Status
```sql
-- View specific user's status
SELECT * FROM post_rate_limits WHERE user_id = 'user-id-here';
SELECT * FROM spam_violations WHERE user_id = 'user-id-here';
SELECT * FROM post_fingerprints WHERE user_id = 'user-id-here';
```

## Performance Considerations

### Optimizations
1. **Indexes**: All critical queries have indexes
2. **Automatic Cleanup**: Prevents table bloat
3. **Efficient Hashing**: MD5 is fast and sufficient
4. **Time-Based Windows**: Automatic expiration reduces active records

### Expected Impact
- **Post Creation**: +50-100ms (validation overhead)
- **Database Size**: Minimal (automatic cleanup)
- **Query Performance**: Negligible (indexed queries)

## Future Enhancements

### Potential Additions
1. **IP-Based Rate Limiting**: Track by IP address
2. **Content Similarity Detection**: Detect minor variations
3. **Machine Learning**: Identify spam patterns
4. **Reputation System**: Adjust limits based on user behavior
5. **Whitelist System**: Exempt verified users from strict limits
6. **Graduated Penalties**: Escalating ban durations

## Summary

The anti-spam system provides **military-grade protection** against spam and abuse:

✅ **Backend-Enforced**: Cannot be bypassed from client
✅ **Multi-Layered**: Client pre-check + backend functions + database trigger
✅ **Account-Age Based**: Stricter limits for new accounts
✅ **Duplicate Detection**: Prevents repeated content
✅ **Escalating Penalties**: Warnings before bans
✅ **Automatic Cleanup**: Self-maintaining
✅ **Performance Optimized**: Minimal impact
✅ **Security Logged**: Complete audit trail

**Result:** Robust spam prevention with excellent user experience for legitimate users.

---

**Version:** 1.0.0
**Last Updated:** January 20, 2025
