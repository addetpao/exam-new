-- Migration: Create users table with RBAC support
-- Created: 2025-09-05
-- Description: Foundation user table for ExamPrep CompTIA A+ platform
-- This table extends Supabase auth.users with application-specific fields

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('user', 'content_editor', 'admin');

-- Create enum for user status
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');

-- Create users table that references Supabase auth.users
CREATE TABLE users (
    -- Primary key - matches Supabase auth.users.id
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core user information
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    
    -- Application-specific fields
    role user_role NOT NULL DEFAULT 'user',
    status user_status NOT NULL DEFAULT 'pending_verification',
    
    -- Profile information
    avatar_url TEXT,
    bio TEXT,
    
    -- Trial and onboarding
    trial_started_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Preferences
    preferences JSONB DEFAULT '{}'::JSONB,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT name_length CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 100),
    CONSTRAINT trial_dates_valid CHECK (trial_ends_at IS NULL OR trial_started_at IS NULL OR trial_ends_at > trial_started_at),
    CONSTRAINT preferences_is_object CHECK (jsonb_typeof(preferences) = 'object')
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_created_at ON users (created_at);
CREATE INDEX idx_users_trial_ends_at ON users (trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- Create GIN index for preferences JSONB
CREATE INDEX idx_users_preferences ON users USING GIN (preferences);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (except role and status)
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id 
        AND role = OLD.role  -- Prevent role escalation
        AND status = OLD.status  -- Prevent status modification
    );

-- Admins can read all users
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can update all users
CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Content editors can view all users (read-only for moderation)
CREATE POLICY "Content editors can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'content_editor')
        )
    );

-- Public signup policy (insert new users)
CREATE POLICY "Allow public signup" ON users
    FOR INSERT WITH CHECK (true);

-- Create helper functions
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
BEGIN
    RETURN (SELECT role FROM users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT role = 'admin' FROM users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_content_editor(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT role IN ('admin', 'content_editor') FROM users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle trial expiration
CREATE OR REPLACE FUNCTION check_trial_status(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT 
            CASE 
                WHEN trial_ends_at IS NULL THEN FALSE
                WHEN trial_ends_at > NOW() THEN TRUE
                ELSE FALSE
            END
        FROM users 
        WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE users IS 'Application users table extending Supabase auth.users with ExamPrep-specific fields';
COMMENT ON COLUMN users.id IS 'UUID primary key matching Supabase auth.users.id';
COMMENT ON COLUMN users.email IS 'User email address, must be unique and valid format';
COMMENT ON COLUMN users.name IS 'User display name for the application';
COMMENT ON COLUMN users.role IS 'User role for RBAC: user, content_editor, admin';
COMMENT ON COLUMN users.status IS 'Account status: active, inactive, suspended, pending_verification';
COMMENT ON COLUMN users.preferences IS 'User preferences stored as JSONB for flexibility';
COMMENT ON COLUMN users.trial_started_at IS 'When user trial period began';
COMMENT ON COLUMN users.trial_ends_at IS 'When user trial period expires';
COMMENT ON COLUMN users.onboarding_completed IS 'Whether user has completed initial onboarding flow';