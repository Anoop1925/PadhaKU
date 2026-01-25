# 🚀 QUICK START GUIDE - Run These Scripts First!

## Step 1️⃣: Fix the Database View (REQUIRED)
```sql
-- Run in Supabase SQL Editor

-- Add your teacher email
INSERT INTO users (email, display_name, role) 
VALUES ('panoop2005.ap@gmail.com', 'Panoop', 'teacher')
ON CONFLICT (email) DO UPDATE SET role = 'teacher';

-- Fix the view to include teacher_email
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
```

## Step 2️⃣: Setup OAuth Users (REQUIRED for OAuth login)
```sql
-- Run in Supabase SQL Editor

-- Set student role for all OAuth users
UPDATE users 
SET role = 'student' 
WHERE (role IS NULL OR role = '')
AND email != 'panoop2005.ap@gmail.com';

-- Ensure display names
UPDATE users 
SET display_name = COALESCE(display_name, split_part(email, '@', 1))
WHERE display_name IS NULL OR display_name = '';

-- Initialize points
INSERT INTO user_points (user_email, points, total_chapters_completed, total_courses_completed)
SELECT email, 0, 0, 0
FROM users
WHERE email NOT IN (SELECT user_email FROM user_points)
ON CONFLICT (user_email) DO NOTHING;
```

## Step 3️⃣: Verify Setup
```sql
-- Check all users have roles
SELECT email, display_name, role 
FROM users 
ORDER BY role, email;

-- Should see:
-- panoop2005.ap@gmail.com | Panoop | teacher
-- other@emails.com | Display Name | student
```

---

## 🎯 Now You Can:

### ✅ Create Projects
- Go to `/teacher/projects`
- Click "Create New Project"
- Add milestones
- Submit!

### ✅ Create Groups
- Click on your project
- Go to "Groups" tab
- Click "Create Group"
- **New**: Students already in groups are automatically hidden! ✨
- Select students and submit

### ✅ View Group Members
- **New**: Click on any group card
- Modal shows full member list with names and emails! 👥

### ✅ Students Can See Projects
- Students log in with OAuth
- See projects they're assigned to
- Submit milestones
- **All 4 group members can submit!** 🚀

---

## 📚 Full Documentation:
- **Complete Workflow**: [PROJECT_WORKFLOW.md](PROJECT_WORKFLOW.md)
- **New Features Details**: [NEW_FEATURES.md](NEW_FEATURES.md)
- **Database Fix**: [fix_project_system.sql](fix_project_system.sql)
- **OAuth Fix**: [fix_oauth_users.sql](fix_oauth_users.sql)

---

## 🆘 Need Help?

### Projects not showing?
→ Run Step 1 (fix_project_system.sql)

### Students can't see projects?
→ Run Step 2 (fix_oauth_users.sql)

### Students in multiple groups?
→ This is now prevented automatically! ✨

### Can't see member names?
→ Run the display_name update from Step 2

---

**That's it! Your system is ready!** 🎉
