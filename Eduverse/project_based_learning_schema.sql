-- ============================================================================
-- PROJECT-BASED LEARNING MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ============================================================================
-- Platform: Supabase (PostgreSQL)
-- Version: 2.0
-- Description: Milestone-driven project system with group collaboration
-- Aligned with existing LMS database structure
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD ROLE COLUMN TO EXISTING USERS TABLE
-- ============================================================================
-- Add role column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin'));

-- Set default role for existing users (you can update manually later)
UPDATE users SET role = 'student' WHERE role IS NULL;

-- ============================================================================
-- TABLE 1: PROJECTS
-- Purpose: Teacher-created projects with milestones
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  teacher_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  total_marks INTEGER NOT NULL DEFAULT 100,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for teacher's projects lookup
CREATE INDEX IF NOT EXISTS idx_projects_teacher_email ON projects(teacher_email);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ============================================================================
-- TABLE 2: PROJECT_MILESTONES
-- Purpose: Sequential milestones within each project
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_milestones (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  max_marks INTEGER NOT NULL,
  sequence_order INTEGER NOT NULL,
  requirements TEXT, -- JSON or text describing what's needed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique sequence per project
  UNIQUE(project_id, sequence_order)
);

-- Index for fetching milestones by project
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_sequence ON project_milestones(project_id, sequence_order);

-- ============================================================================
-- TABLE 3: PROJECT_GROUPS
-- Purpose: Student groups assigned to projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_groups (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique group names per project
  UNIQUE(project_id, group_name)
);

-- Index for project groups lookup
CREATE INDEX IF NOT EXISTS idx_groups_project_id ON project_groups(project_id);

-- ============================================================================
-- TABLE 4: GROUP_MEMBERS
-- Purpose: Students assigned to each group
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
  student_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One student can only be in one group per project
  UNIQUE(group_id, student_email)
);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_student_email ON group_members(student_email);

-- ============================================================================
-- TABLE 5: MILESTONE_SUBMISSIONS
-- Purpose: Group submissions for each milestone
-- ============================================================================
CREATE TABLE IF NOT EXISTS milestone_submissions (
  id SERIAL PRIMARY KEY,
  milestone_id INTEGER NOT NULL REFERENCES project_milestones(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
  submitted_by VARCHAR(255) NOT NULL REFERENCES users(email), -- Which group member submitted
  submission_type VARCHAR(50) NOT NULL CHECK (submission_type IN ('file', 'link', 'text')),
  submission_data TEXT NOT NULL, -- URL, file path, or text content
  submission_notes TEXT, -- Optional notes from student
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One submission per milestone per group (can be updated before evaluation)
  UNIQUE(milestone_id, group_id)
);

-- Indexes for submission queries
CREATE INDEX IF NOT EXISTS idx_submissions_milestone_id ON milestone_submissions(milestone_id);
CREATE INDEX IF NOT EXISTS idx_submissions_group_id ON milestone_submissions(group_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_by ON milestone_submissions(submitted_by);

-- ============================================================================
-- TABLE 6: MILESTONE_EVALUATIONS
-- Purpose: Teacher evaluations of milestone submissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS milestone_evaluations (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES milestone_submissions(id) ON DELETE CASCADE,
  evaluated_by VARCHAR(255) NOT NULL REFERENCES users(email), -- Teacher who evaluated
  marks_awarded INTEGER NOT NULL,
  feedback TEXT,
  approved BOOLEAN DEFAULT FALSE,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One evaluation per submission
  UNIQUE(submission_id)
);

-- Indexes for evaluation queries
CREATE INDEX IF NOT EXISTS idx_evaluations_submission_id ON milestone_evaluations(submission_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluated_by ON milestone_evaluations(evaluated_by);
CREATE INDEX IF NOT EXISTS idx_evaluations_approved ON milestone_evaluations(approved);

-- ============================================================================
-- VIEWS: Useful queries for common operations
-- ============================================================================

-- View: Group Progress - Shows which milestone each group is on
CREATE OR REPLACE VIEW group_progress AS
SELECT 
  pg.id AS group_id,
  pg.project_id,
  pg.group_name,
  COUNT(DISTINCT me.id) AS completed_milestones,
  MAX(pm.sequence_order) AS current_milestone_order,
  COALESCE(SUM(me.marks_awarded), 0) AS total_marks_earned
FROM project_groups pg
LEFT JOIN milestone_submissions ms ON pg.id = ms.group_id
LEFT JOIN milestone_evaluations me ON ms.id = me.submission_id AND me.approved = true
LEFT JOIN project_milestones pm ON ms.milestone_id = pm.id
GROUP BY pg.id, pg.project_id, pg.group_name;

-- View: Student Project Overview - Shows all projects a student is part of
CREATE OR REPLACE VIEW student_projects AS
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

-- View: Teacher Project Dashboard - Shows all projects with group counts
CREATE OR REPLACE VIEW teacher_project_dashboard AS
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

-- View: Pending Submissions for Teachers
CREATE OR REPLACE VIEW pending_evaluations AS
SELECT 
  ms.id AS submission_id,
  p.id AS project_id,
  p.title AS project_title,
  pm.title AS milestone_title,
  pg.group_name,
  u.display_name AS submitted_by_user,
  ms.submission_type,
  ms.submitted_at,
  p.teacher_email
FROM milestone_submissions ms
JOIN project_milestones pm ON ms.milestone_id = pm.id
JOIN projects p ON pm.project_id = p.id
JOIN project_groups pg ON ms.group_id = pg.id
JOIN users u ON ms.submitted_by = u.email
LEFT JOIN milestone_evaluations me ON ms.id = me.submission_id
WHERE me.id IS NULL -- No evaluation yet
ORDER BY ms.submitted_at ASC;

-- ============================================================================
-- FUNCTIONS: Helper functions for business logic
-- ============================================================================

-- Function: Get next unlocked milestone for a group
CREATE OR REPLACE FUNCTION get_next_milestone(p_group_id INTEGER)
RETURNS TABLE (
  milestone_id INTEGER,
  title TEXT,
  description TEXT,
  max_marks INTEGER,
  sequence_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id,
    pm.title,
    pm.description,
    pm.max_marks,
    pm.sequence_order
  FROM project_milestones pm
  WHERE pm.project_id = (
    SELECT project_id FROM project_groups WHERE id = p_group_id
  )
  AND pm.sequence_order = (
    -- Get the next milestone after the last approved one
    SELECT COALESCE(MAX(pm2.sequence_order), 0) + 1
    FROM milestone_submissions ms
    JOIN milestone_evaluations me ON ms.id = me.submission_id
    JOIN project_milestones pm2 ON ms.milestone_id = pm2.id
    WHERE ms.group_id = p_group_id
    AND me.approved = TRUE
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if group can submit to a milestone
CREATE OR REPLACE FUNCTION can_submit_milestone(p_group_id INTEGER, p_milestone_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_required_sequence INTEGER;
  v_completed_sequence INTEGER;
BEGIN
  -- Get the sequence order of the milestone being submitted
  SELECT sequence_order INTO v_required_sequence
  FROM project_milestones
  WHERE id = p_milestone_id;
  
  -- Get the highest approved milestone sequence for this group
  SELECT COALESCE(MAX(pm.sequence_order), 0) INTO v_completed_sequence
  FROM milestone_submissions ms
  JOIN milestone_evaluations me ON ms.id = me.submission_id
  JOIN project_milestones pm ON ms.milestone_id = pm.id
  WHERE ms.group_id = p_group_id
  AND me.approved = TRUE;
  
  -- Can submit if this is the next sequential milestone
  RETURN v_required_sequence = v_completed_sequence + 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS: Automatic timestamp updates
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to projects table
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment below to insert sample data for testing

/*
-- First, add teacher role to an existing user
UPDATE users SET role = 'teacher' WHERE email = '1032220350@tcetmumbai.in' LIMIT 1;

-- Insert sample project
INSERT INTO projects (teacher_email, title, description, total_marks)
VALUES (
  '1032220350@tcetmumbai.in',
  'Database Management System Project',
  'Build a complete DBMS with frontend and backend',
  100
);

-- Insert sample milestones
INSERT INTO project_milestones (project_id, title, description, max_marks, sequence_order)
VALUES 
  ((SELECT id FROM projects ORDER BY id DESC LIMIT 1), 'Idea Submission', 'Submit project idea and scope', 10, 1),
  ((SELECT id FROM projects ORDER BY id DESC LIMIT 1), 'ER Diagram', 'Create Entity-Relationship diagram', 10, 2),
  ((SELECT id FROM projects ORDER BY id DESC LIMIT 1), 'User Flow Diagram', 'Design user interaction flows', 10, 3),
  ((SELECT id FROM projects ORDER BY id DESC LIMIT 1), 'Backend Code', 'Implement backend APIs', 20, 4),
  ((SELECT id FROM projects ORDER BY id DESC LIMIT 1), 'Frontend Code', 'Build user interface', 20, 5),
  ((SELECT id FROM projects ORDER BY id DESC LIMIT 1), 'Deployment', 'Deploy and submit screenshots', 30, 6);

-- Create a sample group
INSERT INTO project_groups (project_id, group_name)
VALUES (
  (SELECT id FROM projects ORDER BY id DESC LIMIT 1),
  'Team Alpha'
);

-- Add students to group (use existing student emails)
INSERT INTO group_members (group_id, student_email)
VALUES 
  ((SELECT id FROM project_groups ORDER BY id DESC LIMIT 1), '1032220210@tcetmumbai.in'),
  ((SELECT id FROM project_groups ORDER BY id DESC LIMIT 1), '1032221362@tcetmumbai.in'),
  ((SELECT id FROM project_groups ORDER BY id DESC LIMIT 1), 'amit.kumar@example.com');
*/

-- ============================================================================
-- VERIFICATION QUERIES (Run after schema creation)
-- ============================================================================

-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'projects', 
  'project_milestones', 
  'project_groups', 
  'group_members', 
  'milestone_submissions', 
  'milestone_evaluations'
);

-- Check all views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public';

-- Check all functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
