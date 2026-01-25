-- ============================================================================
-- FIX PROJECT-BASED LEARNING SYSTEM
-- Run this script in your Supabase SQL Editor
-- ============================================================================

-- ISSUE 1: Add your teacher email to users table (if not exists)
-- Replace 'panoop2005.ap@gmail.com' with your actual email
INSERT INTO users (email, display_name, role) 
VALUES ('panoop2005.ap@gmail.com', 'Panoop', 'teacher')
ON CONFLICT (email) DO UPDATE 
SET role = 'teacher', 
    display_name = COALESCE(users.display_name, 'Panoop');

-- ISSUE 2: Update teacher_project_dashboard view to include teacher_email
DROP VIEW IF EXISTS teacher_project_dashboard CASCADE;

CREATE VIEW teacher_project_dashboard AS
SELECT 
  p.id AS project_id,
  p.teacher_email,
  p.title,
  p.description,
  p.total_marks,
  p.status,
  p.created_at,
  COUNT(DISTINCT pg.id) AS total_groups,
  COUNT(DISTINCT gm.student_email) AS total_students,
  COUNT(DISTINCT pm.id) AS total_milestones
FROM projects p
LEFT JOIN project_groups pg ON p.id = pg.project_id
LEFT JOIN group_members gm ON pg.id = gm.group_id
LEFT JOIN project_milestones pm ON p.id = pm.project_id
GROUP BY p.id, p.teacher_email, p.title, p.description, p.total_marks, p.status, p.created_at;

-- Verify the fix
SELECT * FROM teacher_project_dashboard LIMIT 5;
