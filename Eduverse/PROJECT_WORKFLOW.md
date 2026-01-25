# PROJECT-BASED LEARNING SYSTEM - COMPLETE WORKFLOW

## 🔧 FIRST: Fix the Errors

### Run this SQL in your Supabase SQL Editor:
```sql
-- 1. Add your teacher email to users table
INSERT INTO users (email, display_name, role) 
VALUES ('panoop2005.ap@gmail.com', 'Panoop', 'teacher')
ON CONFLICT (email) DO UPDATE 
SET role = 'teacher';

-- 2. Fix the teacher_project_dashboard view
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

---

## 📋 COMPLETE WORKFLOW

### **Phase 1: Teacher Creates Project** 👨‍🏫
1. **Navigate**: Go to `/teacher/projects`
2. **Click**: "Create New Project" button
3. **Fill Form**:
   - Project Title (e.g., "Build a Weather App")
   - Project Description
   - Total Marks (e.g., 100)
   - Status (Active/Draft/Archived)
4. **Add Milestones** (click "+ Add Milestone"):
   - Milestone 1: "Setup & Planning" - 10 marks
   - Milestone 2: "Database Design" - 20 marks
   - Milestone 3: "Backend API" - 30 marks
   - Milestone 4: "Frontend UI" - 25 marks
   - Milestone 5: "Deployment" - 15 marks
5. **Validation**: System ensures total milestone marks ≤ project total marks
6. **Submit**: Project created! ✅

**Result**: 
- Project appears in your projects list
- All milestones created in sequential order
- Status: Active (visible to students after group assignment)

---

### **Phase 2: Teacher Creates Student Groups** 👥
1. **Navigate**: Click on your created project
2. **Go to**: "Groups" tab
3. **Click**: "Create Group" button
4. **Fill Form**:
   - Group Name (e.g., "Team Alpha")
   - Search & Select Students:
     - Student 1 (shows their points for balanced grouping)
     - Student 2
     - Student 3
   - **Note**: Students already assigned to other groups for this project won't appear! ✨
5. **Submit**: Group created! ✅

**View Group Members**: 🔍
- Click on any group card to see a modal with:
  - Full list of student names and emails
  - Group progress stats
  - Total marks earned
  - Member avatars

**Important Notes**:
- You can create multiple groups for the same project
- Each student can only be in ONE group per project
- **Smart Filtering**: Students already in a group for THIS project are automatically excluded from the selection list
- Students must exist in the `users` table with role='student'
- You can see student points to help balance teams

**Repeat** this step to create more groups (Team Beta, Team Gamma, etc.)

---

### **Phase 3: Students Submit Work** 📝

#### Student View:
1. **Navigate**: Go to `/student/projects`
2. **See**: All projects they're assigned to (via groups)
3. **Click**: On a project to see milestone stepper

#### Milestone Stepper States:
- 🔒 **Locked** (gray) - Future milestones, not yet accessible
- 🔵 **Active** (blue ring) - Current milestone, ready to submit
- ⏳ **Submitted** (clock icon) - Waiting for teacher evaluation
- ✅ **Approved** (green check) - Completed, marks awarded

#### Submission Process:
1. **Active Milestone**: Only ONE milestone is active at a time (sequential gating)
2. **Choose Submission Type**:
   - **File URL**: Google Drive/Dropbox link
   - **Link**: Website/GitHub repo link
   - **Text**: Direct text submission
3. **Add Notes** (optional): Additional context for teacher
4. **Submit**: Work sent to teacher! ✅

**Critical Rule**: Students CANNOT skip milestones. Must complete Milestone 1 before Milestone 2 unlocks.

---

### **Phase 4: Teacher Evaluates Work** ✅

1. **Navigate**: Go to project detail page
2. **Go to**: "Pending" tab (shows count of pending evaluations)
3. **See**: All submissions awaiting review, showing:
   - Milestone title
   - Group name
   - Submission type
   - Submitted by (student email)
   - Submission date
4. **Click**: "Evaluate" button
5. **Review**: Modal shows submission details:
   - For text: Full text displayed
   - For links: Clickable link to review work
   - Student notes displayed
6. **Fill Evaluation Form**:
   - **Marks Awarded**: 0 to max_marks (e.g., 0-20 for 20-mark milestone)
   - **Feedback**: Optional but recommended (guides students)
7. **Submit**: Click "Approve & Submit" ✅

**What Happens**:
- Evaluation saved in `milestone_evaluations` table
- Marks added to group's total
- **NEXT MILESTONE UNLOCKS AUTOMATICALLY** for that group! 🎉
- Student sees marks and feedback immediately
- Pending count decreases

---

### **Phase 5: Repeat Until Project Complete** 🔄

1. Students see next milestone (was 🔒 locked, now 🔵 active)
2. Students submit work for Milestone 2
3. Teacher evaluates in Pending tab
4. Milestone 3 unlocks...
5. Continue until all 5 milestones completed

**Final State**:
- All milestones ✅ approved
- Group has earned total marks
- Project marked as completed
- Students see completion message

---

## 🎯 SYSTEM FLOW SUMMARY

```
1. Teacher Creates Project
   ↓
2. Teacher Creates Groups (assigns students)
   ↓
3. Student Submits Milestone 1
   ↓
4. Teacher Evaluates & Approves Milestone 1
   ↓
5. Milestone 2 UNLOCKS automatically
   ↓
6. Student Submits Milestone 2
   ↓
7. Teacher Evaluates & Approves Milestone 2
   ↓
8. Milestone 3 UNLOCKS...
   ↓
   (Repeat for all milestones)
   ↓
9. PROJECT COMPLETE! 🎉
```

---

## 📊 KEY FEATURES

### **Sequential Gating**:
- Enforced by `can_submit_milestone()` database function
- Students cannot skip ahead
- Forces proper project progression

### **Automatic Unlocking**:
- Next milestone unlocks when teacher approves current one
- Determined by `get_next_milestone()` database function
- No manual unlock needed

### **Group Collaboration**:
- All group members share same project progress
- One submission per milestone per group
- Any group member can submit (tracked by submitted_by)

### **Real-Time Updates**:
- Teacher's pending count updates after evaluation
- Student sees new milestone immediately after approval
- Progress bars update automatically

### **Database Views**:
- `teacher_project_dashboard`: Teacher's project list
- `student_projects`: Student's assigned projects
- `pending_evaluations`: Submissions needing evaluation
- `group_progress`: Real-time group completion stats

---

## ⚠️ IMPORTANT NOTES

1. **OAuth Users Setup**: If using OAuth (Google, GitHub, etc.), run the OAuth fix script first!
   ```sql
   -- Set roles for OAuth users
   UPDATE users SET role = 'teacher' WHERE email = 'your-teacher@email.com';
   UPDATE users SET role = 'student' WHERE email IN ('student1@email.com', 'student2@email.com');
   ```

2. **User Must Exist**: Before creating projects, ensure your email exists in `users` table with role='teacher'

3. **Students Must Exist**: Before creating groups, students need role='student' in users table

4. **No Duplicate Groups**: Students already in a group for a project are automatically hidden when creating new groups ✨

5. **No Skipping**: Sequential gating is enforced at database level via functions

6. **One Submission Per Milestone**: UNIQUE constraint prevents duplicate submissions

7. **Approval Gates Progress**: Only approved=true unlocks next milestone

8. **Marks Validation**: Cannot award more than milestone's max_marks

9. **View Group Members**: Click any group card to see full member list with names and emails 👥

---

## 🐛 TROUBLESHOOTING

### Error: "teacher_email not in users table"
**Solution**: Run the fix script to add your email to users table

### Error: "Projects not showing for students"
**Cause**: OAuth users don't have role set
**Solution**: Run [fix_oauth_users.sql](fix_oauth_users.sql):
```sql
UPDATE users SET role = 'student' 
WHERE role IS NULL OR role = ''
AND email != 'your-teacher@email.com';
```

### Error: "student not in users table" when creating groups
**Solution**: Add students to users table:
```sql
INSERT INTO users (email, display_name, role) 
VALUES ('student@example.com', 'Student Name', 'student')
ON CONFLICT (email) DO UPDATE SET role = 'student';
```

### Students already in groups still showing up
**Cause**: Browser cache or API not updated
**Solution**: 
1. Hard refresh the page (Ctrl+Shift+R)
2. Close and reopen the modal
3. Verify API is being called with `?projectId=X` parameter

### Can't see group member names (only emails showing)
**Cause**: Users don't have display_name set
**Solution**:
```sql
UPDATE users 
SET display_name = split_part(email, '@', 1)
WHERE display_name IS NULL OR display_name = '';
```

### Error: "Cannot submit milestone"
**Cause**: Previous milestone not approved yet
**Solution**: Teacher must approve previous milestone first

### Pending tab empty but students submitted
**Cause**: View not updated
**Solution**: Re-run the fix script to recreate the view

---

## 📈 PROGRESS TRACKING

### Teacher Dashboard:
- Total groups per project
- Total students enrolled
- Total milestones
- Pending evaluations count

### Student Dashboard:
- Projects assigned to them
- Current milestone (active)
- Progress percentage
- Marks earned so far

### Group Progress View:
- Completed milestones count
- Total marks earned
- Percentage complete

---

Enjoy your complete project-based learning system! 🚀
