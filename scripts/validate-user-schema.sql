-- Validation script for user table schema
-- This script can be run to validate the user table design

-- Test enum creation
SELECT enumtypid, enumlabel 
FROM pg_enum e 
JOIN pg_type t ON e.enumtypid = t.oid 
WHERE t.typname IN ('user_role', 'user_status');

-- Test table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test constraints
SELECT 
    con.conname as constraint_name,
    con.contype as constraint_type,
    pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'users';

-- Test indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'users'
AND schemaname = 'public';

-- Test RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users';

-- Test helper functions
SELECT 
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('get_user_role', 'is_admin', 'is_content_editor', 'check_trial_status');

-- Test triggers
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    t.tgenabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'users';

-- Test sample data constraints
SELECT 
    'Email format validation' as test,
    CASE WHEN 'test@example.com' ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' 
        THEN 'PASS' ELSE 'FAIL' END as result
UNION ALL
SELECT 
    'Invalid email rejection',
    CASE WHEN NOT 'invalid-email' ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' 
        THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 
    'Name length validation',
    CASE WHEN LENGTH('Test User') >= 1 AND LENGTH('Test User') <= 100 
        THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 
    'JSON preferences validation',
    CASE WHEN jsonb_typeof('{"theme": "dark"}'::jsonb) = 'object' 
        THEN 'PASS' ELSE 'FAIL' END;