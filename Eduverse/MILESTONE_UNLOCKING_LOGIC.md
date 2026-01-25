# Milestone Unlocking Logic

## How It Works

The milestone unlocking system follows a **sequential progression** model:

### 1. First Milestone (Milestone 1)
- **Always unlocked** for students when they join a group
- Status: `active` (ready for submission)
- No prerequisites required

### 2. Subsequent Milestones (Milestone 2, 3, etc.)
- **Locked by default**
- **Unlocks automatically** when the previous milestone is:
  - Submitted by student ✅
  - Evaluated by teacher ✅
  - **Approved** by teacher ✅

### Milestone Status Flow

```
┌─────────────┐
│   LOCKED    │  ← Default state (gray lock icon)
│  (initial)  │     Cannot submit work
└──────┬──────┘
       │
       │ Previous milestone approved
       │ (or this is milestone 1)
       ▼
┌─────────────┐
│   ACTIVE    │  ← Ready for submission (blue circle)
│             │     Student can upload work
└──────┬──────┘
       │
       │ Student submits work
       ▼
┌─────────────┐
│  SUBMITTED  │  ← Pending teacher evaluation (clock icon)
│             │     Waiting for teacher review
└──────┬──────┘
       │
       │ Teacher evaluates & approves
       ▼
┌─────────────┐
│  APPROVED   │  ← Milestone complete (green checkmark)
│             │     Next milestone unlocks
└─────────────┘
```

## Implementation Details

### API Logic (Backend)
**File**: `src/app/api/projects/[id]/student/route.ts`

```typescript
// For each milestone in sequence:
if (evaluation && evaluation.approved) {
  status = "approved";          // Has approval ✓
} else if (submission) {
  status = "submitted";          // Awaiting evaluation ⏳
} else if (milestone.sequence_order === 1) {
  status = "active";             // First milestone always unlocked 🔓
} else if (previousMilestone.isApproved) {
  status = "active";             // Previous approved, this unlocks 🔓
} else {
  status = "locked";             // Still locked 🔒
}
```

### Key Database Tables

#### `project_milestones`
- `sequence_order`: Determines milestone order (1, 2, 3...)
- No boolean lock field needed - status computed dynamically

#### `milestone_submissions`
- `group_id`: Links submission to student group
- `milestone_id`: Which milestone this is for
- `submitted_at`: Timestamp of submission

#### `milestone_evaluations`
- `submission_id`: Links to submission
- `approved`: **Boolean** - `true` unlocks next milestone
- `marks_awarded`: Score given by teacher

## Student Workflow

1. **Student joins group** → Milestone 1 unlocked
2. **Student submits Milestone 1** → Status changes to "submitted"
3. **Teacher evaluates & approves** → Status changes to "approved"
4. **Milestone 2 unlocks automatically** → Status changes to "active"
5. **Repeat** for all milestones

## Teacher Workflow

1. Create project with milestones
2. Create group and assign students
3. Wait for submissions
4. Evaluate in "Pending" tab
5. Award marks and approve
6. Next milestone unlocks for students

## Important Notes

- ✅ **No manual unlocking required** - system handles it automatically
- ✅ **Sequential only** - students cannot skip milestones
- ✅ **Approval required** - just submitting doesn't unlock next milestone
- ✅ **Group-based** - all students in a group share the same progress
- ❌ **No database function dependency** - uses simple array logic
- ❌ **No separate lock table** - status computed from submissions/evaluations

## Troubleshooting

### All Milestones Locked?
**Check:**
1. Is student actually in a group? 
   ```sql
   SELECT * FROM group_members WHERE student_email = 'student@email.com';
   ```

2. Does milestone 1 have sequence_order = 1?
   ```sql
   SELECT * FROM project_milestones WHERE project_id = X ORDER BY sequence_order;
   ```

### Milestone Won't Unlock?
**Check previous milestone evaluation:**
```sql
SELECT 
  ms.milestone_id,
  ms.submitted_at,
  me.approved,
  me.marks_awarded
FROM milestone_submissions ms
LEFT JOIN milestone_evaluations me ON ms.id = me.submission_id
WHERE ms.group_id = <group_id>
ORDER BY ms.milestone_id;
```

Make sure `approved = true` for previous milestone!

## Console Logs

When student loads project page, API logs:
```
Student project request: { projectId: 'X', email: 'student@email.com' }
Total submissions for group: 2
Milestone 1 (ds): status=approved, has_submission=true, has_evaluation=true
Milestone 2 (reg): status=active, has_submission=false, has_evaluation=false
Milestone 3 (feeewf): status=locked, has_submission=false, has_evaluation=false
Final milestone statuses: [ 'ds: approved', 'reg: active', 'feeewf: locked' ]
```

This shows exactly why each milestone has its current status.
