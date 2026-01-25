-- ============================================================================
-- FIX OAUTH USERS FOR PROJECT SYSTEM
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ISSUE: OAuth users might not have the 'role' column set
-- This prevents project assignments from working properly

-- Step 1: Check existing users without roles
SELECT email, display_name, role 
FROM users 
WHERE role IS NULL OR role = ''
ORDER BY email;

-- Step 2: List ALL users to see what emails are in the system
SELECT email, display_name, role 
FROM users 
ORDER BY role, email;

-- Step 3: Update OAuth users with appropriate roles
-- Set teacher role for your email
UPDATE users 
SET role = 'teacher' 
WHERE email = 'panoop2005.ap@gmail.com';

-- Set student role for all other users (adjust as needed)
UPDATE users 
SET role = 'student' 
WHERE (role IS NULL OR role = '')
AND email != 'panoop2005.ap@gmail.com';

-- Step 4: Ensure display_name is set for all users
UPDATE users 
SET display_name = COALESCE(display_name, split_part(email, '@', 1))
WHERE display_name IS NULL OR display_name = '';

-- Step 5: Initialize user_points for users who don't have it
INSERT INTO user_points (user_email, points, total_chapters_completed, total_courses_completed)
SELECT email, 0, 0, 0
FROM users
WHERE email NOT IN (SELECT user_email FROM user_points)
ON CONFLICT (user_email) DO NOTHING;

-- Step 6: Verify the changes
SELECT 
    u.email, 
    u.display_name, 
    u.role,
    COALESCE(up.points, 0) as points,
    CASE 
        WHEN gm.student_email IS NOT NULL THEN 'In group'
        ELSE 'Not in group'
    END as group_status
FROM users u
LEFT JOIN user_points up ON u.email = up.user_email
LEFT JOIN group_members gm ON u.email = gm.student_email
ORDER BY u.role, u.email;

-- Step 7: Check which students are in groups
SELECT 
    u.email,
    u.display_name,
    pg.group_name,
    p.title as project_title
FROM users u
JOIN group_members gm ON u.email = gm.student_email
JOIN project_groups pg ON gm.group_id = pg.id
JOIN projects p ON pg.project_id = p.id
WHERE u.role = 'student'
ORDER BY p.id, pg.group_name;

-- ============================================================================
-- EXPECTED OUTPUT:
-- Step 2: Shows ALL users in your system
-- Step 6: All users should have:
--   - role set (teacher or student)
--   - display_name set
--   - entry in user_points
-- Step 7: Shows which students are assigned to which projects
-- ============================================================================

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================
-- If Step 7 returns empty:
-- 1. Teacher hasn't created any groups yet
-- 2. Groups were created but students weren't added
-- 3. Email mismatch between OAuth and database

-- To check OAuth email vs database email:
-- Look at your browser console when logged in, or check the session
-- Then update if needed:
-- UPDATE group_members SET student_email = 'correct@oauth.email' 
-- WHERE student_email = 'wrong@email.com';
-- ============================================================================

-- ============================================================================
-- COMMAND TO CHANGE USER EMAIL
-- ============================================================================
-- Use this when OAuth email doesn't match database email
-- Replace 'old@email.com' with current email in database
-- Replace 'new@email.com' with OAuth email from browser console

-- Step 1: Check what email you want to change
SELECT email, display_name, role FROM users WHERE email = 'old@email.com';

-- Step 2: Update ALL tables that reference this email
BEGIN;

-- Update primary users table
UPDATE users 
SET email = 'new@email.com' 
WHERE email = 'old@email.com';

-- Update group_members (if student)
UPDATE group_members 
SET student_email = 'new@email.com' 
WHERE student_email = 'old@email.com';

-- Update user_points
UPDATE user_points 
SET user_email = 'new@email.com' 
WHERE user_email = 'old@email.com';

-- Update user_progress (if exists)
UPDATE user_progress 
SET user_email = 'new@email.com' 
WHERE user_email = 'old@email.com';

-- Update points_history (if exists)
UPDATE points_history 
SET user_email = 'new@email.com' 
WHERE user_email = 'old@email.com';

-- Update courses table (if teacher/creator)
UPDATE courses 
SET userEmail = 'new@email.com' 
WHERE userEmail = 'old@email.com';

-- Update projects table (if teacher)
UPDATE projects 
SET teacher_email = 'new@email.com' 
WHERE teacher_email = 'old@email.com';

-- Update milestone_submissions (if exists)
UPDATE milestone_submissions 
SET submitted_by = 'new@email.com' 
WHERE submitted_by = 'old@email.com';

-- Update milestone_evaluations (if exists)
UPDATE milestone_evaluations 
SET evaluated_by = 'new@email.com' 
WHERE evaluated_by = 'old@email.com';

COMMIT;

-- Step 3: Verify the change
SELECT 'users' as table_name, email FROM users WHERE email = 'new@email.com'
UNION ALL
SELECT 'group_members', student_email FROM group_members WHERE student_email = 'new@email.com'
UNION ALL
SELECT 'user_points', user_email FROM user_points WHERE user_email = 'new@email.com';

-- ============================================================================
-- QUICK SINGLE-LINE VERSION (if you're confident)
-- ============================================================================
-- UPDATE users SET email = 'new@email.com' WHERE email = 'old@email.com';
-- UPDATE group_members SET student_email = 'new@email.com' WHERE student_email = 'old@email.com';
-- UPDATE user_points SET user_email = 'new@email.com' WHERE user_email = 'old@email.com';
-- UPDATE user_progress SET user_email = 'new@email.com' WHERE user_email = 'old@email.com';
-- UPDATE points_history SET user_email = 'new@email.com' WHERE user_email = 'old@email.com';
-- ============================================================================
