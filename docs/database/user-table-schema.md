# User Table Schema Design (DB-002.1)

## Overview
This document defines the user table structure for the ExamPrep platform, designed to integrate seamlessly with Supabase Auth while maintaining platform-specific user data and role management.

## Schema Architecture

### Integration with Supabase Auth
The user table will integrate with Supabase's built-in `auth.users` table:
- **auth.users**: Managed by Supabase (email, password, OAuth data)
- **public.users**: Platform-specific data (profile, roles, preferences)
- **Connection**: Foreign key relationship via UUID

## Table Structure

### Table Name: `users`

```sql
CREATE TABLE public.users (
    -- Primary Key (matches auth.users.id)
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Core User Information
    name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
    email TEXT NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    
    -- Role-Based Access Control
    role user_role_enum NOT NULL DEFAULT 'user',
    
    -- User Status and Preferences
    status user_status_enum NOT NULL DEFAULT 'active',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    subscription_status subscription_status_enum DEFAULT 'free',
    
    -- Profile Information
    first_name TEXT CHECK (length(first_name) <= 50),
    last_name TEXT CHECK (length(last_name) <= 50),
    avatar_url TEXT CHECK (avatar_url ~* '^https?://'),
    timezone TEXT DEFAULT 'UTC',
    
    -- Exam Preferences
    preferred_exam_mode exam_mode_enum DEFAULT 'practice',
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Audit Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ -- Soft delete support
);
```

## Enum Definitions

### user_role_enum
```sql
CREATE TYPE user_role_enum AS ENUM (
    'user',          -- Standard learner (default)
    'sme',           -- Subject Matter Expert (content contributor)
    'editor',        -- Content Editor (review/publish)
    'admin'          -- Platform Administrator
);
```

### user_status_enum
```sql
CREATE TYPE user_status_enum AS ENUM (
    'active',        -- Active user (default)
    'inactive',      -- Temporarily inactive
    'suspended',     -- Suspended due to policy violation
    'deleted'        -- Soft deleted
);
```

### subscription_status_enum
```sql
CREATE TYPE subscription_status_enum AS ENUM (
    'free',          -- Free tier (default)
    'trial',         -- Trial period
    'basic',         -- Basic paid subscription
    'premium',       -- Premium paid subscription
    'enterprise',    -- Enterprise subscription
    'cancelled',     -- Cancelled subscription
    'expired'        -- Expired subscription
);
```

### exam_mode_enum
```sql
CREATE TYPE exam_mode_enum AS ENUM (
    'practice',      -- Practice mode (default)
    'exam',          -- Exam simulation mode
    'review'         -- Review mode
);
```

## Constraints and Validation

### Primary Constraints
- **Primary Key**: `id` (UUID) - References `auth.users(id)`
- **Unique Constraints**: `email` (enforced at application level)
- **Foreign Key**: `id` → `auth.users(id)` with CASCADE DELETE

### Data Validation
- **name**: 2-100 characters, not null
- **email**: Valid email regex pattern, unique
- **first_name/last_name**: Max 50 characters each
- **avatar_url**: Valid HTTP/HTTPS URL format
- **timezone**: Valid timezone string (default: UTC)

### Business Rules
- Default role: `user`
- Default status: `active`
- Default subscription: `free`
- Email verification starts as `false`
- Notifications enabled by default

## Indexes

### Performance Indexes
```sql
-- Email lookup (most common query)
CREATE INDEX idx_users_email ON users(email);

-- Role-based queries
CREATE INDEX idx_users_role ON users(role);

-- Status filtering
CREATE INDEX idx_users_status ON users(status) WHERE status != 'deleted';

-- Subscription status queries
CREATE INDEX idx_users_subscription_status ON users(subscription_status);

-- Soft delete support
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;

-- Last activity tracking
CREATE INDEX idx_users_last_seen ON users(last_seen_at) WHERE last_seen_at IS NOT NULL;

-- Composite index for common admin queries
CREATE INDEX idx_users_role_status ON users(role, status) WHERE deleted_at IS NULL;
```

## Integration Points

### Supabase Auth Integration
```sql
-- Trigger to sync with auth.users changes
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Update email from auth.users when it changes
    UPDATE public.users 
    SET email = NEW.email, updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_auth_user_email
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_email();
```

### Auto-Update Trigger
```sql
-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Row Level Security (RLS) Preparation

### Security Policies (to be implemented in DB-006)
- **Users can read their own profile**
- **Users can update their own profile (limited fields)**
- **Admins can read all users**
- **Editors can read active users**
- **SMEs can read other SMEs and users**

### RLS-Ready Design
- All user-facing columns designed for selective exposure
- Sensitive fields (role changes) require elevated permissions
- Audit trail through timestamps and metadata

## Data Migration Strategy

### From Existing Systems
```sql
-- Example migration from legacy user systems
INSERT INTO public.users (id, name, email, role, created_at)
SELECT 
    auth_users.id,
    COALESCE(legacy_users.full_name, 'User'),
    auth_users.email,
    CASE 
        WHEN legacy_users.is_admin THEN 'admin'::user_role_enum
        WHEN legacy_users.is_editor THEN 'editor'::user_role_enum
        ELSE 'user'::user_role_enum
    END,
    legacy_users.created_at
FROM auth.users auth_users
LEFT JOIN legacy_users ON auth_users.email = legacy_users.email;
```

## Testing Considerations

### Sample Data Structure
- Admin user: `admin@examprep.com`
- Editor user: `editor@examprep.com` 
- SME user: `sme@examprep.com`
- Regular users: `user1@test.com`, `user2@test.com`

### Validation Tests
- Email format validation
- Name length constraints
- Role assignment and changes
- Soft delete functionality
- Timestamp automatic updates

## Performance Considerations

### Query Optimization
- Most queries will filter by `status != 'deleted'`
- Email lookups are most common (unique index)
- Role-based filtering needs efficient indexing
- Admin dashboards need role+status composite queries

### Expected Load
- Read-heavy workload (profile views, auth checks)
- Infrequent updates (profile changes)
- Bulk operations rare (admin functions)

## Security Considerations

### Data Protection
- No password storage (handled by Supabase Auth)
- Email is sensitive but searchable by admins
- Role changes require admin privileges
- Soft delete preserves audit trail

### Access Patterns
- Users: Own profile only
- SMEs: Can view other users for content attribution
- Editors: Can view user profiles for content management
- Admins: Full access for platform management

## Next Steps (DB-002.2)

1. Create the actual table with all enums and constraints
2. Implement indexes for performance optimization
3. Set up triggers for automated timestamp updates
4. Create sync mechanism with Supabase Auth
5. Prepare for RLS policy implementation in DB-006

## Schema Validation

### Ready for Implementation
- ✅ All column definitions complete
- ✅ Constraints and validation rules defined
- ✅ Enum types specified
- ✅ Index strategy planned
- ✅ Integration points identified
- ✅ Security considerations documented

This schema design provides a solid foundation for the ExamPrep platform's user management system while maintaining seamless integration with Supabase Auth.