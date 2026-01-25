-- Migration: Fix student_projects view to include missing columns
-- Run this in your Supabase SQL Editor

-- Drop the existing view first (required when changing column structure)
DROP VIEW IF EXISTS student_projects CASCADE;

-- Create the view with all required columns
CREATE VIEW student_projects AS
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
WHERE u.role = 'student';
