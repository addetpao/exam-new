# User Table Schema Design - ExamPrep Platform

## Overview

The user table serves as the foundation for user management in the ExamPrep CompTIA A+ certification platform. It integrates with Supabase Auth while providing application-specific fields for roles, trials, preferences, and user status tracking.

## Table Structure

### Core Fields

| Field   | Type         | Constraints                            | Purpose                |
| ------- | ------------ | -------------------------------------- | ---------------------- |
| `id`    | UUID         | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE, CHECK format         | User email address     |
| `name`  | VARCHAR(100) | NOT NULL, LENGTH 1-100                 | Display name           |

### Role-Based Access Control (RBAC)

| Field    | Type        | Values                                                    | Purpose          |
| -------- | ----------- | --------------------------------------------------------- | ---------------- |
| `role`   | user_role   | 'user', 'content_editor', 'admin'                         | Permission level |
| `status` | user_status | 'active', 'inactive', 'suspended', 'pending_verification' | Account state    |

**Role Hierarchy:**

- **user**: Standard exam takers, can access practice/exam content
- **content_editor**: Can create/edit questions, view analytics, moderate content
- **admin**: Full system access, user management, billing oversight

### Profile & Customization

| Field         | Type  | Purpose                                    |
| ------------- | ----- | ------------------------------------------ |
| `avatar_url`  | TEXT  | Profile picture URL (Supabase Storage)     |
| `bio`         | TEXT  | User biography/description                 |
| `preferences` | JSONB | User settings (theme, notifications, etc.) |

### Trial & Onboarding

| Field                  | Type        | Purpose                 |
| ---------------------- | ----------- | ----------------------- |
| `trial_started_at`     | TIMESTAMPTZ | When trial period began |
| `trial_ends_at`        | TIMESTAMPTZ | Trial expiration date   |
| `onboarding_completed` | BOOLEAN     | Onboarding flow status  |

### Audit Fields

| Field           | Type        | Purpose                       |
| --------------- | ----------- | ----------------------------- |
| `created_at`    | TIMESTAMPTZ | Account creation timestamp    |
| `updated_at`    | TIMESTAMPTZ | Last modification timestamp   |
| `last_login_at` | TIMESTAMPTZ | Last authentication timestamp |

## Constraints & Validation

### Data Integrity

```sql
-- Email format validation
CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')

-- Name length validation
CONSTRAINT name_length CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 100)

-- Trial date consistency
CONSTRAINT trial_dates_valid CHECK (trial_ends_at IS NULL OR trial_started_at IS NULL OR trial_ends_at > trial_started_at)

-- Preferences must be valid JSON object
CONSTRAINT preferences_is_object CHECK (jsonb_typeof(preferences) = 'object')
```

## Performance Indexes

### Standard Indexes

- `idx_users_email` - Email lookups (unique constraint)
- `idx_users_role` - Role-based filtering
- `idx_users_status` - Status filtering
- `idx_users_created_at` - Chronological sorting

### Specialized Indexes

- `idx_users_trial_ends_at` - Partial index for active trials only
- `idx_users_preferences` - GIN index for JSONB preference queries

## Row Level Security (RLS) Policies

### User Self-Management

```sql
-- Users can view their own profile
"Users can view own profile" - SELECT where auth.uid() = id

-- Users can update their own profile (except role/status)
"Users can update own profile" - UPDATE with role/status protection
```

### Administrative Access

```sql
-- Admins can view/update all users
"Admins can view all users" - SELECT for admin role
"Admins can update all users" - UPDATE for admin role

-- Content editors have read-only access to all users
"Content editors can view all users" - SELECT for content_editor role
```

### Public Access

```sql
-- Allow new user registration
"Allow public signup" - INSERT with CHECK (true)
```

## Helper Functions

### Role Checking

- `get_user_role(user_id)` - Returns user's role
- `is_admin(user_id)` - Boolean admin check
- `is_content_editor(user_id)` - Boolean editor/admin check

### Trial Management

- `check_trial_status(user_id)` - Returns trial active status

## Database Triggers

### Automatic Timestamps

- `update_users_updated_at` - Updates `updated_at` on row modification
- Uses `update_updated_at_column()` function

## Integration Points

### Supabase Auth

- User ID matches `auth.users.id`
- Email synced with authentication system
- JWT claims include role information for client-side RBAC

### Future Relationships

- **subscriptions** table will reference `users.id`
- **attempts** table will track user exam performance
- **progress_rollup** will aggregate user learning data

## Sample Preferences Schema

```json
{
  "theme": "light|dark",
  "notifications": {
    "email": true,
    "push": false,
    "study_reminders": true
  },
  "study_preferences": {
    "daily_goal_minutes": 30,
    "preferred_difficulty": "mixed",
    "focus_areas": ["hardware", "networking"]
  },
  "accessibility": {
    "high_contrast": false,
    "font_size": "medium",
    "screen_reader": false
  }
}
```

## Security Considerations

### Data Protection

- Email addresses are PII and require protection
- RLS policies prevent unauthorized access
- Role changes require admin privileges
- Status changes controlled server-side

### Trial System

- Trial periods tracked server-side
- Cannot be extended client-side
- Expired trials enforce content restrictions

### Role Escalation Prevention

- Users cannot modify their own role
- Status changes restricted to admins
- Role checks use security definer functions

## Migration Notes

### Initial Setup

1. Creates enums for roles and status
2. Creates table with all constraints
3. Sets up indexes for performance
4. Enables RLS with comprehensive policies
5. Creates helper functions

### Rollback Strategy

- Drop helper functions
- Drop RLS policies
- Drop indexes
- Drop table
- Drop enums

## Testing Data

Seed file includes:

- System admin account
- Content editor account
- Sample users with various trial states
- Different preference configurations

## Performance Expectations

- User lookup by email: < 10ms
- Role-based queries: < 50ms
- Bulk user operations: < 200ms
- Preference updates: < 30ms

## Future Enhancements

- User groups/organizations
- Advanced preference schemas
- Audit log integration
- OAuth provider metadata
- User activity tracking
