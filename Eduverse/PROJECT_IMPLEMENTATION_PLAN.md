# 🎯 Project-Based Learning System - Implementation Plan

## 📋 Overview
Building a milestone-driven project management system for educational institutions with sequential progression, group collaboration, and teacher evaluation.

---

## 🚀 Phase 1: Database Setup ✅ READY

### What to do:
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the entire content from `project_based_learning_schema.sql`
4. Click "Run"
5. Verify tables are created by checking the Tables section

### What you get:
- ✅ 6 core tables created
- ✅ 4 useful views for queries
- ✅ 2 helper functions for business logic
- ✅ Proper indexes for performance
- ✅ Constraints for data integrity

---

## 🚀 Phase 2: Navigation Update (NEXT - Current Phase)

### Teacher Sidebar Addition
**File:** `src/app/teacher/layout.tsx` or sidebar component

Add new menu item:
```typescript
{
  icon: FolderKanban, // or ProjectIcon
  label: 'Projects',
  href: '/teacher/projects'
}
```

### Student Sidebar Addition
**File:** `src/app/student/layout.tsx` or sidebar component

Add new menu item:
```typescript
{
  icon: FolderKanban,
  label: 'Projects', 
  href: '/student/projects'
}
```

### Layout Structure (CRITICAL)
Both pages MUST use the dashboard layout wrapper:
```typescript
// src/app/teacher/projects/layout.tsx
import DashboardLayout from '@/components/DashboardLayout'

export default function ProjectsLayout({ children }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
```

---

## 🚀 Phase 3: Teacher - Project List View

### Page: `/teacher/projects/page.tsx`

**Purpose:** Show all projects created by teacher

**Features:**
- List of projects (card grid)
- Create new project button
- Project stats (groups, students, milestones)
- Quick actions (view, edit, archive)

**Data needed:**
- Query: `teacher_project_dashboard` view
- Filter: `teacher_id = current_user.id`

---

## 🚀 Phase 4: Teacher - Create Project

### Component: `CreateProjectModal.tsx`

**Form fields:**
- Title (text)
- Description (textarea)
- Total marks (number)
- Milestones (dynamic list):
  - Title
  - Description
  - Max marks
  - Sequence order (auto-increment)

**API:**
- POST `/api/projects/create`
- Creates project + milestones in one transaction

---

## 🚀 Phase 5: Teacher - Create Groups

### Page: `/teacher/projects/[id]/groups`

**Purpose:** Form balanced student groups

**Features:**
- Show all students (sorted by points)
- Multi-select students
- Auto-suggest balanced groups
- Manual override
- Set group name
- Create group button

**Data needed:**
- All students with points
- Existing groups for this project

**API:**
- POST `/api/projects/[id]/groups/create`

---

## 🚀 Phase 6: Teacher - Project Detail Dashboard

### Page: `/teacher/projects/[id]/page.tsx`

**Tabs:**
1. **Overview** - Project details, edit button
2. **Groups** - List all groups with progress
3. **Milestones** - View/edit milestone structure
4. **Pending** - Submissions awaiting evaluation
5. **Analytics** - Progress graphs, completion rates

---

## 🚀 Phase 7: Teacher - Evaluate Submissions

### Page: `/teacher/projects/[id]/evaluate/[submissionId]`

**Features:**
- View submission (file/link/text)
- Show group members
- Show milestone requirements
- Input marks (0 to max_marks)
- Input feedback (textarea)
- Approve/Reject buttons

**API:**
- POST `/api/projects/evaluate`
- Creates evaluation record
- Unlocks next milestone if approved

---

## 🚀 Phase 8: Student - My Projects List

### Page: `/student/projects/page.tsx`

**Purpose:** Show all projects student is part of

**Features:**
- Project cards with:
  - Project title
  - Group name
  - Current milestone
  - Progress bar (milestones completed)
  - Marks earned / total
- Click to open project detail

**Data needed:**
- Query: `student_projects` view
- Filter: `student_id = current_user.id`

---

## 🚀 Phase 9: Student - Project Detail & Submission

### Page: `/student/projects/[id]/page.tsx`

**Layout:**
- Left: Milestone stepper (vertical timeline)
  - ✅ Completed milestones (green, marks visible)
  - ⏳ Current milestone (blue, submission form)
  - 🔒 Locked milestones (gray, disabled)
- Right: Current milestone details
  - Title & description
  - Requirements
  - Max marks
  - Submission form (if not submitted)
  - Feedback (if evaluated)

**Features:**
- Upload file / paste link / enter text
- Add notes
- Submit button
- View group members
- Download previous submissions

**API:**
- POST `/api/projects/submit`
- Validation: Can only submit to unlocked milestone

---

## 🚀 Phase 10: Student - Group View

### Component: Group member list with avatars

**Features:**
- Show all group members
- Indicate who submitted each milestone
- Show individual activity timeline

---

## 🔧 API Routes Needed

### Projects
- `POST /api/projects/create` - Create project with milestones
- `GET /api/projects/teacher` - Get teacher's projects
- `GET /api/projects/student` - Get student's projects
- `GET /api/projects/[id]` - Get project details
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Archive project

### Groups
- `POST /api/projects/[id]/groups/create` - Create group
- `GET /api/projects/[id]/groups` - Get all groups
- `PATCH /api/groups/[id]` - Update group
- `DELETE /api/groups/[id]` - Remove group

### Submissions
- `POST /api/projects/submit` - Submit milestone
- `GET /api/projects/[id]/submissions` - Get group submissions
- `GET /api/submissions/pending` - Get pending evaluations

### Evaluations
- `POST /api/projects/evaluate` - Evaluate submission
- `GET /api/projects/[id]/evaluations` - Get all evaluations

---

## 🎨 UI Components Needed

### Shared
- `ProjectCard.tsx` - Display project overview
- `MilestoneTimeline.tsx` - Vertical stepper with status
- `ProgressBar.tsx` - Show completion percentage
- `GroupMemberList.tsx` - Display group members

### Teacher
- `CreateProjectModal.tsx` - Project creation form
- `CreateGroupModal.tsx` - Group formation UI
- `EvaluationCard.tsx` - Submission evaluation interface
- `ProjectAnalytics.tsx` - Charts and stats

### Student
- `SubmissionForm.tsx` - File/link/text submission
- `MilestoneCard.tsx` - Current milestone details
- `FeedbackDisplay.tsx` - Show teacher feedback

---

## 📊 Database Helper Queries (Use these in API routes)

### Get student's current project & milestone
```sql
SELECT 
  p.id AS project_id,
  p.title,
  pg.id AS group_id,
  pg.group_name,
  get_next_milestone(pg.id) AS current_milestone
FROM projects p
JOIN project_groups pg ON p.id = pg.project_id
JOIN group_members gm ON pg.id = gm.group_id
WHERE gm.student_id = $1;
```

### Get pending submissions for teacher
```sql
SELECT * FROM pending_evaluations
WHERE project_title IN (
  SELECT title FROM projects WHERE teacher_id = $1
);
```

### Check if student can submit
```sql
SELECT can_submit_milestone($1, $2);
```

---

## 🎯 Current Status

✅ **Phase 1:** Database schema ready
⏳ **Phase 2:** Navigation update (NEXT)
⬜ **Phase 3-10:** To be implemented

---

## 🚦 Implementation Order

**Priority 1 (Core Flow):**
1. Phase 2: Navigation
2. Phase 3: Teacher project list
3. Phase 4: Create project
4. Phase 8: Student project list
5. Phase 9: Student submission
6. Phase 7: Teacher evaluation

**Priority 2 (Enhancement):**
7. Phase 5: Group creation
8. Phase 6: Teacher dashboard
9. Phase 10: Group view

---

## ⚠️ Critical Rules to Follow

1. **Always use layout wrappers** - Pages open beside sidebar
2. **Sequential milestone logic** - Enforce in API with `can_submit_milestone()`
3. **Group-level evaluation** - All members get same marks
4. **Consistent UI** - Reuse components between teacher/student views
5. **Real-time updates** - Use Supabase subscriptions for live data

---

## 📝 Next Immediate Action

Run the SQL schema in Supabase, then tell me when ready to proceed with Phase 2 (Navigation update).
