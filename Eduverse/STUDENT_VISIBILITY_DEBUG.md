# 🔍 STUDENT PROJECT VISIBILITY TROUBLESHOOTING

## Issue: Students Can't See Projects They're Assigned To

### Root Causes (Most Common to Least):

---

## 1️⃣ Email Mismatch (90% of cases) ⚠️

### The Problem:
OAuth providers (Google, GitHub) might use a different email format than what's in your database.

**Example**:
- OAuth gives: `student@gmail.com`
- Database has: `student@university.edu`
- Group created with: `student@university.edu`
- Student logs in with: `student@gmail.com`
- **Result**: Can't see project! ❌

### How to Check:
1. **See what email OAuth is using**:
   - Log in as the student
   - Open browser DevTools (F12)
   - Go to Console tab
   - Type: `console.log(session?.user?.email)` in your app
   - Note the exact email

2. **Check what's in the database**:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT email, display_name, role FROM users WHERE role = 'student';
   ```

3. **Check what's in group_members**:
   ```sql
   SELECT student_email, group_id FROM group_members;
   ```

### The Fix:
**Option A**: Update database to match OAuth email
```sql
-- Update users table
UPDATE users 
SET email = 'oauth-email@gmail.com' 
WHERE email = 'old-email@university.edu';

-- Update group_members table
UPDATE group_members 
SET student_email = 'oauth-email@gmail.com' 
WHERE student_email = 'old-email@university.edu';

-- Update user_points table
UPDATE user_points 
SET user_email = 'oauth-email@gmail.com' 
WHERE user_email = 'old-email@university.edu';
```

**Option B**: Recreate groups with correct email
1. Teacher deletes the group
2. Teacher creates new group
3. Teacher adds student with CORRECT OAuth email

---

## 2️⃣ Missing 'role' Column (OAuth Users)

### The Problem:
OAuth users get created in the `users` table but their `role` column is NULL or empty.

### How to Check:
```sql
SELECT email, display_name, role 
FROM users 
WHERE role IS NULL OR role = '';
```

### The Fix:
Run [fix_oauth_users.sql](fix_oauth_users.sql):
```sql
UPDATE users 
SET role = 'student' 
WHERE (role IS NULL OR role = '')
AND email != 'panoop2005.ap@gmail.com';
```

---

## 3️⃣ Student Not in Any Groups

### The Problem:
Teacher created project but hasn't created groups yet, or student wasn't added to any group.

### How to Check:
```sql
-- Check if student is in any groups
SELECT 
    gm.student_email,
    pg.group_name,
    p.title as project_title
FROM group_members gm
JOIN project_groups pg ON gm.group_id = pg.id
JOIN projects p ON pg.project_id = p.id
WHERE gm.student_email = 'student@email.com';

-- If returns empty, student is not in any groups!
```

### The Fix:
1. Teacher goes to project detail page
2. Clicks "Groups" tab
3. Clicks "Create Group"
4. Selects the student
5. Submits

---

## 4️⃣ View Doesn't Exist or Is Outdated

### The Problem:
The `student_projects` view wasn't created or doesn't include the `teacher_email` column in related views.

### How to Check:
```sql
-- Check if view exists
SELECT COUNT(*) 
FROM information_schema.views 
WHERE table_name = 'student_projects';

-- Should return 1
```

### The Fix:
Run the complete schema:
```sql
-- From project_based_learning_schema.sql
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
```

---

## 5️⃣ Group Creation Failed Silently

### The Problem:
Group was created but members weren't inserted due to transaction failure.

### How to Check:
```sql
-- Check groups without members
SELECT 
    pg.id,
    pg.group_name,
    pg.project_id,
    COUNT(gm.student_email) as member_count
FROM project_groups pg
LEFT JOIN group_members gm ON pg.id = gm.group_id
GROUP BY pg.id, pg.group_name, pg.project_id
HAVING COUNT(gm.student_email) = 0;

-- Shows groups with 0 members (shouldn't happen!)
```

### The Fix:
Delete empty groups and recreate:
```sql
-- Delete the empty group
DELETE FROM project_groups WHERE id = X;

-- Teacher recreates via UI
```

---

## 🔧 Complete Diagnostic Script

Run [debug_student_projects.sql](debug_student_projects.sql) and replace `YOUR_STUDENT_EMAIL_HERE` with actual email:

```sql
-- 1. Check user exists and has role
SELECT email, display_name, role FROM users WHERE email = 'student@email.com';

-- 2. Check if in any groups
SELECT * FROM group_members WHERE student_email = 'student@email.com';

-- 3. Check what student_projects view returns
SELECT * FROM student_projects WHERE student_email = 'student@email.com';

-- 4. Manual join (should match #3)
SELECT 
    u.email AS student_email,
    p.id AS project_id,
    p.title AS project_title,
    pg.group_name
FROM users u
JOIN group_members gm ON u.email = gm.student_email
JOIN project_groups pg ON gm.group_id = pg.id
JOIN projects p ON pg.project_id = p.id
WHERE u.email = 'student@email.com';
```

---

## 📊 Expected Results vs Actual

### When Everything Works:
```
API Call: GET /api/projects/student?email=student@email.com
Response: {
  "projects": [
    {
      "student_email": "student@email.com",
      "project_id": 1,
      "project_title": "Build Weather App",
      "group_name": "Team Alpha",
      "completed_milestones": 0,
      "total_milestones": 5
    }
  ]
}
```

### When It Fails:
```
API Call: GET /api/projects/student?email=student@email.com
Response: {
  "projects": []
}

Console Logs (check terminal):
- "Fetching student projects for email: student@email.com"
- "User data: { userData: { email: 'student@email.com', role: 'student' }, userError: null }"
- "Group memberships: { groupMemberships: [], groupError: null }" ← ISSUE HERE!
- "Student projects query result: { data: [], count: 0 }"
```

---

## 🎯 Step-by-Step Fix Process

### Step 1: Verify User Setup
```sql
-- Run fix_oauth_users.sql
UPDATE users SET role = 'student' WHERE email = 'ACTUAL_OAUTH_EMAIL';
```

### Step 2: Check Email Match
```bash
# In browser console when student is logged in:
console.log(session?.user?.email);

# Compare with database:
# If different, update database to match!
```

### Step 3: Verify Group Membership
```sql
SELECT * FROM group_members WHERE student_email = 'ACTUAL_OAUTH_EMAIL';

-- If empty, teacher needs to add student to a group!
```

### Step 4: Test the View
```sql
SELECT * FROM student_projects WHERE student_email = 'ACTUAL_OAUTH_EMAIL';

-- Should return at least one row
```

### Step 5: Check API Response
```bash
# Make API call (from browser or Postman)
GET /api/projects/student?email=ACTUAL_OAUTH_EMAIL

# Check server logs in terminal for detailed output
```

---

## ⚡ Quick Fixes Cheat Sheet

| Symptom | Quick Fix |
|---------|-----------|
| Empty projects array | Run fix_oauth_users.sql |
| "User not found" | Check if email in users table matches OAuth email |
| Role is NULL | `UPDATE users SET role = 'student' WHERE email = 'X';` |
| Not in any groups | Teacher adds via "Create Group" |
| View doesn't exist | Run project_based_learning_schema.sql |
| Email mismatch | Update all tables: users, group_members, user_points |

---

## 📱 Frontend Debugging

Add console logs to your student page:

```typescript
// In student/projects/page.tsx
useEffect(() => {
  const fetchProjects = async () => {
    console.log('Session email:', session?.user?.email);
    
    const res = await fetch(`/api/projects/student?email=${session.user.email}`);
    const data = await res.json();
    
    console.log('Projects response:', data);
    console.log('Projects count:', data.projects?.length || 0);
  };
  
  fetchProjects();
}, [session]);
```

---

## 🆘 Still Not Working?

Run this complete diagnostic:

```sql
-- 1. All users
SELECT * FROM users ORDER BY role, email;

-- 2. All groups
SELECT * FROM project_groups ORDER BY project_id;

-- 3. All group members
SELECT * FROM group_members ORDER BY group_id;

-- 4. Join everything manually
SELECT 
    u.email,
    u.role,
    gm.group_id,
    pg.group_name,
    pg.project_id,
    p.title
FROM users u
LEFT JOIN group_members gm ON u.email = gm.student_email
LEFT JOIN project_groups pg ON gm.group_id = pg.id
LEFT JOIN projects p ON pg.project_id = p.id
WHERE u.role = 'student';

-- 5. Test the view
SELECT * FROM student_projects;
```

Check the logs in your Next.js terminal - the new logging will show you exactly where it's failing!

---

**Most likely culprit**: Email mismatch between OAuth and database! 🎯
