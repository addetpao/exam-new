-- Seed data for ExamPrep Platform (CompTIA A+ 220-1201/1202)
-- Created: 2025-09-05
-- Description: Initial users, roles, and test data

-- Clear existing data (for development/testing)
TRUNCATE users CASCADE;

-- Insert initial admin user
INSERT INTO users (
    id,
    email,
    name,
    role,
    status,
    onboarding_completed,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'admin@examprep.com',
    'System Administrator',
    'admin',
    'active',
    true,
    NOW(),
    NOW()
);

-- Insert initial content editor user
INSERT INTO users (
    id,
    email,
    name,
    role,
    status,
    onboarding_completed,
    bio,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'editor@examprep.com',
    'Content Editor',
    'content_editor',
    'active',
    true,
    'CompTIA A+ certified professional and content creator',
    NOW(),
    NOW()
);

-- Insert sample regular users for testing
INSERT INTO users (
    id,
    email,
    name,
    role,
    status,
    onboarding_completed,
    trial_started_at,
    trial_ends_at,
    preferences,
    created_at,
    updated_at
) VALUES 
(
    '00000000-0000-0000-0000-000000000003'::uuid,
    'user1@example.com',
    'John Smith',
    'user',
    'active',
    true,
    NOW() - INTERVAL '5 days',
    NOW() + INTERVAL '9 days',
    '{"theme": "light", "notifications": true, "study_reminders": true}'::jsonb,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
),
(
    '00000000-0000-0000-0000-000000000004'::uuid,
    'user2@example.com',
    'Sarah Johnson',
    'user',
    'active',
    false,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '13 days',
    '{"theme": "dark", "notifications": false, "study_reminders": true}'::jsonb,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
),
(
    '00000000-0000-0000-0000-000000000005'::uuid,
    'user3@example.com',
    'Mike Wilson',
    'user',
    'pending_verification',
    false,
    NULL,
    NULL,
    '{}'::jsonb,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
);

-- Verify seed data
SELECT 
    'Users seeded successfully' as status,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
    COUNT(*) FILTER (WHERE role = 'content_editor') as editor_count,
    COUNT(*) FILTER (WHERE role = 'user') as user_count
FROM users;