# Post Moderation System

## Overview

The post moderation system allows system administrators to apply content restrictions to posts that violate community standards. Moderated posts remain visible to their authors and on their profiles but are excluded from the Discover feed.

**Admin Interface:** Administrators can moderate posts directly from the post menu by clicking the "Moderate" button (visible only to admins), which opens a visual selection modal with all moderation categories.

## Features

### Moderation Categories

The system uses a PostgreSQL ENUM type (`moderation_category`) to ensure type-safe moderation values:

1. **NONE** (Default) - No moderation applied, post appears in Discover feed
2. **child_exploitation** - Content showing child exploitation
3. **child_safety** - Content that endangers children
4. **self_harm_intent** - Content showing intent of self-harm
5. **bullying** - Harassment or bullying behavior
6. **violent_description** - Graphic descriptions of violence
7. **drugs** - Promotion or use of illegal drugs
8. **self_harm** - Content related to self-harm
9. **hate** - Hate speech or symbols
10. **violence** - Depiction of violence
11. **weapons** - Promotion or sale of weapons

The ENUM type prevents typos and invalid values, providing database-level validation. Only these values can be stored in the `moderation_reason` column.

### Automatic Account Status Linking

When a post receives a moderation reason:
- The post owner's account status automatically changes to **'limited'**
- This appears in their Settings under Account Status
- If all moderated posts are removed or unmarked, the account automatically returns to **'active'**

### Visibility Rules

**Moderated Posts:**
- ❌ Excluded from Discover tab
- ✅ Visible on Following tab (if user follows the author)
- ✅ Visible on author's profile page
- ✅ Visible to the post owner everywhere

**Warnings Displayed:**
- Only the post owner sees the moderation warning
- Different message for each moderation category
- Clear explanation that post is not promoted

## Using the Admin Interface

### Moderating a Post (Visual Interface)

1. **Open Post Menu** - Click the three-dot menu on any post
2. **Click "Moderate"** - This option only appears for admin users
3. **Select Category** - Choose from the visual options:
   - **No Moderation** (Green) - Restore post to Discover feed
   - **Child Exploitation** (Red)
   - **Child Safety** (Red)
   - **Self Harm Intent** (Orange)
   - **Bullying** (Orange)
   - **Violent Description** (Amber)
   - **Drugs** (Purple)
   - **Self Harm** (Orange)
   - **Hate** (Red)
   - **Violence** (Red)
   - **Weapons** (Gray)
4. **Apply** - Click "Apply Moderation" to save your selection

The interface shows the current moderation status and provides clear descriptions for each category. Changes take effect immediately and the page will refresh to show the updated status.

## Admin Functions (Database)

### Moderate a Post

```sql
SELECT moderate_post(
  'post-uuid-here',
  'violence'::moderation_category  -- or other valid categories, 'NONE'
);
```

**Response:**
```json
{
  "success": true,
  "message": "Post moderation applied successfully",
  "post_author_id": "author-uuid"
}
```

### Remove Moderation

To restore a post to normal visibility:

```sql
SELECT moderate_post(
  'post-uuid-here',
  'NONE'::moderation_category
);
```

### Check if User Has Moderated Posts

```sql
SELECT user_has_moderated_posts('user-uuid-here');
```

Returns `true` or `false`.

### Update Account Status (Manual)

While account status updates automatically based on post moderation, admins can also manually update it:

```sql
SELECT update_user_account_status(
  'user-uuid-here',
  'limited'  -- or 'active'
);
```

## Warning Messages

The post owner sees one of these messages based on the moderation reason:

### Moderation Categories
The post owner sees a message explaining that their post has been moderated for the specific reason (e.g., "This post has been moderated for child exploitation"). The post remains visible but is not promoted.

## Security Features

### Database Protection
- `moderation_reason` field has check constraint ensuring only valid values
- RLS policies prevent non-admin modifications
- All moderation actions logged in `security_events` table

### Automatic Triggers
- Post moderation triggers automatic account status updates
- Trigger checks if user has any remaining moderated posts before restoring status
- All status changes logged for audit trail

### Query Optimization
- Indexed on `moderation_reason` for fast filtering
- Discover feed query excludes moderated posts at database level
- No additional application-level filtering needed

## Logging

All moderation actions are logged in the `security_events` table:

**Post Moderation:**
```json
{
  "event_type": "post_moderation_applied",
  "event_details": {
    "post_id": "uuid",
    "post_author_id": "uuid",
    "moderation_reason": "violence",
    "moderated_by": "admin-uuid"
  }
}
```

**Account Status Changes:**
```json
{
  "event_type": "account_auto_limited",
  "event_details": {
    "reason": "post_moderated",
    "post_id": "uuid",
    "moderation_reason": "violence"
  }
}
```

## Best Practices

1. **Review Before Moderating** - Ensure content truly violates policies
2. **Use Appropriate Category** - Select the most accurate moderation reason
3. **Document Decisions** - Use security_events logs for case review
4. **Monitor Appeals** - Check user feedback for contested moderations
5. **Regular Audits** - Review moderated content periodically

## Example Workflow

### Moderating a Reported Post (Using Visual Interface)

1. Admin reviews post flagged in user_reports table
2. Admin finds the post in the feed
3. Admin clicks the three-dot menu on the post
4. Admin clicks "Moderate" button (blue shield icon)
5. Moderation modal opens showing 4 visual options
6. Admin selects "Dehumanization" (orange option)
7. Admin clicks "Apply Moderation"
8. System automatically:
   - Updates post's moderation_reason to 'DEHUMANIZATION'
   - Sets author's account_status to 'limited'
   - Logs moderation action in security_events
   - Removes post from Discover feed
   - Page refreshes to show changes
9. Post owner sees amber warning banner on their post (only they see it)
10. Post owner sees 'Limited' status in Settings with explanation

### Removing Moderation (Using Visual Interface)

1. Admin reviews appeal or re-evaluates decision
2. Admin opens the post menu and clicks "Moderate"
3. Admin selects "No Moderation" (green option)
4. Admin clicks "Apply Moderation"
5. System automatically:
   - Checks if user has other moderated posts
   - If none, restores account_status to 'active'
   - Logs status restoration in security_events
   - Returns post to Discover feed
   - Page refreshes to show changes

## Hive AI Automated Moderation

The system integrates Hive AI for real-time content moderation. Before publication (excluding Voice and Poll posts), text content is analyzed and scored from 1 to 3 (Low, Medium, High).

### Moderation Rules & Actions

| Severity | Score | Actions Taken |
| :--- | :--- | :--- |
| **Critical** | 3 (Binary) | For `child_exploitation`, `child_safety`, `self_harm_intent`: Post is **Quarantined** (User-only), visible only to the author. |
| **High** | 3 | Post is **Quarantined** (User-only), visible only to the author. It is completely hidden from all other users. Logged for manual review. |
| **Medium** | 2 | Post removed from **Discover**, content is **Blurred** with a label (reason) in other feeds, and user is **Banned from posting for 48 hours**. |
| **Low** | 1 | Post removed from **Discover** feed. |
| **None** | 0 | No action taken. |

### Visual Labels & Blurring

- **Score 2 (Medium):** The post is marked with a label showing the moderation reason. Anyone can still open/view the post, but it is blurred by default to provide a warning. The author is **blocked from sharing any new content for 48 hours**.
- **Score 3 (High/Critical):** The post is quarantined. It is only visible to the author and is completely hidden from others (including feed placeholders).

### Appeals (Manual Review)

Users can request a manual review for any automated moderation decision (Low, Medium). High severity posts are automatically sent to the manual review queue.

---

## Database Schema

### ENUM Type: moderation_category
```sql
CREATE TYPE moderation_category AS ENUM (
  'NONE',
  'child_exploitation',
  'child_safety',
  'self_harm_intent',
  'bullying',
  'violent_description',
  'drugs',
  'self_harm',
  'hate',
  'violence',
  'weapons'
);
```

### posts.moderation_reason
```sql
moderation_reason moderation_category NOT NULL DEFAULT 'NONE'
```

### profiles.account_status
```sql
account_status text DEFAULT 'active'
CHECK (account_status IN ('active', 'limited'))
```

## Indexes

```sql
-- Fast filtering of moderated posts
CREATE INDEX idx_posts_moderation_reason ON posts(moderation_reason)
  WHERE moderation_reason != 'NONE';

-- Discover feed optimization (only non-moderated posts)
CREATE INDEX idx_posts_discover_feed ON posts(created_at DESC)
  WHERE moderation_reason = 'NONE';

-- Account status queries
CREATE INDEX idx_profiles_account_status ON profiles(account_status);
```

## Troubleshooting

### Post Still Showing in Discover
- Verify moderation was applied: `SELECT moderation_reason FROM posts WHERE id = 'post-uuid'`
- Check if cache needs clearing
- Verify Discover feed query includes `eq('moderation_reason', '--')`

### Account Status Not Updating
- Check trigger: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_account_status_on_moderation'`
- Verify user has moderated posts: `SELECT user_has_moderated_posts('user-uuid')`
- Check security_events for failed updates

### User Can't See Warning
- Verify user owns the post: `currentUserId === post.author_id`
- Check moderation_reason is not '--'
- Ensure PostCard component includes moderation warning logic
