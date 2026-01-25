-- ============================================================================
-- DEBUG STUDENT PROJECT VISIBILITY
-- Run this to understand why students can't see their projects
-- ============================================================================

-- Step 1: Check if student_projects view exists
SELECT COUNT(*) as view_exists
FROM information_schema.views
WHERE table_name = 'student_projects';

-- Step 2: Check your student user
-- Replace with your actual student email
SELECT email, display_name, role 
FROM users 
WHERE email = 'YOUR_STUDENT_EMAIL_HERE';

-- Step 3: Check if student is in any groups
SELECT 
    gm.student_email,
    gm.group_id,
    pg.group_name,
    pg.project_id,
    p.title as project_title
FROM group_members gm
JOIN project_groups pg ON gm.group_id = pg.id
JOIN projects p ON pg.project_id = p.id
WHERE gm.student_email = 'YOUR_STUDENT_EMAIL_HERE';

-- Step 4: Check what the student_projects view returns
SELECT * 
FROM student_projects
WHERE student_email = 'YOUR_STUDENT_EMAIL_HERE';

-- Step 5: Check if the view definition is correct
SELECT pg_get_viewdef('student_projects', true);

-- Step 6: Check all components separately
-- Users with student role
SELECT email, display_name, role FROM users WHERE role = 'student';

-- All group members
SELECT * FROM group_members;

-- All project groups
SELECT * FROM project_groups;

-- All projects
SELECT id, title, teacher_email, status FROM projects;

-- Step 7: Manual join to see what should appear
SELECT 
    u.email AS student_email,
    u.display_name,
    p.id AS project_id,
    p.title AS project_title,
    p.description,
    p.total_marks,
    p.status,
    pg.id AS group_id,
    pg.group_name,
    gp.completed_milestones,
    gp.total_marks_earned,
    (SELECT COUNT(*) FROM project_milestones pm WHERE pm.project_id = p.id) AS total_milestones
FROM users u
JOIN group_members gm ON u.email = gm.student_email
JOIN project_groups pg ON gm.group_id = pg.id
JOIN projects p ON pg.project_id = p.id
LEFT JOIN group_progress gp ON pg.id = gp.group_id
WHERE u.role = 'student'
AND u.email = 'YOUR_STUDENT_EMAIL_HERE';

-- ============================================================================
-- COMMON ISSUES AND FIXES
-- ============================================================================

-- ISSUE 1: Student doesn't have role set
-- FIX:
-- UPDATE users SET role = 'student' WHERE email = 'YOUR_STUDENT_EMAIL_HERE';

-- ISSUE 2: Student not in any groups
-- FIX: Teacher needs to add them to a group via the UI

-- ISSUE 3: View doesn't exist
-- FIX: Run the project_based_learning_schema.sql script

-- ISSUE 4: Group created but members not added
-- FIX:
-- Check group_members table:
SELECT * FROM group_members WHERE group_id = YOUR_GROUP_ID;
-- If empty, there was an error during group creation

-- ISSUE 5: Email mismatch (OAuth email vs database email)
-- FIX:
-- Check what email OAuth is using:
SELECT email FROM users WHERE display_name = 'YOUR_NAME';
-- Update group_members if needed:
-- UPDATE group_members SET student_email = 'correct@email.com' WHERE student_email = 'wrong@email.com';

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- Step 1: Should return 1 (view exists)
-- Step 2: Should show student with role='student'
-- Step 3: Should show at least one group membership
-- Step 4: Should show at least one project
-- Step 7: Should match Step 4 results
-- ============================================================================
