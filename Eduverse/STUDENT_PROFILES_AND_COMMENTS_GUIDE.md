# Student Profiles and Private Comments - Feature Guide

## Overview

This guide covers the new features added to the assignment grading system:
1. **Real Student Information**: Fetch and display actual student names, emails, and profile photos
2. **Private Comments**: Add feedback that only specific students can see when grading

## 1. Student Profile Integration

### API Endpoint

**GET** `/api/teacher/classrooms/[id]/students`

Fetches the list of students enrolled in a course using Google Classroom API.

#### Request
```typescript
GET /api/teacher/classrooms/{courseId}/students
Headers:
  Authorization: Bearer {accessToken}
```

#### Response
```json
{
  "students": [
    {
      "courseId": "123456",
      "userId": "user123",
      "profile": {
        "id": "user123",
        "name": {
          "givenName": "John",
          "familyName": "Doe",
          "fullName": "John Doe"
        },
        "emailAddress": "john.doe@school.edu",
        "photoUrl": "https://..."
      }
    }
  ]
}
```

### Implementation Details

**File**: `src/app/api/teacher/classrooms/[id]/students/route.ts`

- Uses Google Classroom API: `courses.students.list`
- Required OAuth scope: `classroom.rosters.readonly` or `classroom.rosters`
- Returns up to 100 students per request (pageSize=100)
- Includes full profile information with names, emails, and photos

### Frontend Integration

**File**: `src/components/teacher/AssignmentReviewModal.tsx`

```typescript
const fetchStudentProfiles = async (subs: StudentSubmission[]) => {
  // Fetch real student profiles from Google Classroom
  const response = await fetch(`/api/teacher/classrooms/${classroomId}/students`);
  const data = await response.json();
  
  // Map students by userId
  const profiles = new Map<string, UserProfile>();
  data.students?.forEach((student: any) => {
    profiles.set(student.userId, {
      id: student.userId,
      name: student.profile.name,
      emailAddress: student.profile.emailAddress,
      photoUrl: student.profile.photoUrl,
    });
  });
  
  setStudentProfiles(profiles);
};
```

### Fallback Behavior

If the API fails to fetch student profiles:
- Displays placeholder names: `Student {userId.substring(0, 8)}`
- Shows generic email: `student@example.com`
- Ensures UI remains functional even without profile data

## 2. Private Comments Feature

### What are Private Comments?

Private comments are feedback that teachers can add when grading submissions. These comments:
- Are only visible to the specific student receiving the grade
- Are **not** visible to other students
- Appear in the student's submission view in Google Classroom
- Support up to 500 characters
- Are optional when grading

### API Changes

**PATCH** `/api/teacher/classrooms/[id]/coursework/[workId]/submissions/[submissionId]`

#### Updated Request Body
```json
{
  "assignedGrade": 85,
  "draftGrade": 85,
  "draftComment": "Great work! Your analysis was thorough and well-structured."
}
```

#### Google Classroom API Mapping

The comment is sent to Google Classroom's `studentSubmissions.patch` endpoint with the `draftComment` field:

```typescript
const updateBody: any = {
  assignedGrade: 85,
  draftGrade: 85,
  draftComment: "Your private comment here"
};

await fetch(
  `${BASE_URL}/courses/${courseId}/courseWork/${workId}/studentSubmissions/${submissionId}?updateMask=assignedGrade,draftGrade,draftComment`,
  {
    method: 'PATCH',
    body: JSON.stringify(updateBody)
  }
);
```

### UI Implementation

**Location**: `SubmissionDetailView` component in `AssignmentReviewModal.tsx`

```tsx
<div>
  <label className="block text-sm font-medium text-slate-700 mb-2">
    Private Comment <span className="text-slate-500 font-normal">(optional)</span>
  </label>
  <textarea
    value={commentInput}
    onChange={(e) => setCommentInput(e.target.value)}
    placeholder="Add a private comment for this student (only visible to them)"
    disabled={isReturned || grading}
    rows={3}
    maxLength={500}
    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-slate-100 resize-none"
  />
  <p className="text-xs text-slate-500 mt-1">
    {commentInput.length}/500 characters • Only {studentName} can see this comment
  </p>
</div>
```

### Features

1. **Character Counter**: Displays `{current}/500 characters` in real-time
2. **Student Name Reference**: Shows which student will see the comment
3. **Input Validation**: 
   - Maximum 500 characters enforced by `maxLength` attribute
   - Trimmed before sending to API
   - Empty comments are not sent (optional field)
4. **Disabled States**: 
   - Disabled when submission is already returned
   - Disabled during grading operation (loading state)

## 3. User Flow

### Teacher Workflow with New Features

1. **Click Assignment Card** → Opens AssignmentReviewModal
2. **View Student List** → See real names and emails (not placeholder IDs)
3. **Click Student Name** → View their submission
4. **Enter Grade** → Type numeric grade
5. **Add Private Comment** (Optional):
   - Type feedback in textarea
   - See character count update
   - Preview which student will see it
6. **Click "Save Grade"** → Sends grade + comment to API
7. **Click "Return to Student"** → Makes grade and comment visible in Google Classroom

### Student Experience

When a teacher returns graded work:
1. Student receives notification in Google Classroom
2. Opens assignment to view grade
3. Sees private comment from teacher (if provided)
4. Comment is visible only to that student
5. Can respond or make corrections based on feedback

## 4. Data Flow Diagram

```
Teacher Grading Flow:
┌─────────────────────────────────────────────────────────────┐
│ 1. Teacher opens assignment                                  │
│    → GET /students (fetch real student profiles)            │
│    → GET /submissions (fetch all student submissions)       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Teacher clicks student                                    │
│    → Display: Real name (e.g., "John Doe")                  │
│    → Display: Real email (e.g., "john.doe@school.edu")      │
│    → Display: Submitted work (attachments, answers)         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Teacher grades submission                                 │
│    → Enters grade: 85                                        │
│    → Enters comment: "Great work on the analysis!"          │
│    → Clicks "Save Grade"                                     │
│    → PATCH /submissions/[id]                                 │
│       Body: {                                                │
│         assignedGrade: 85,                                   │
│         draftGrade: 85,                                      │
│         draftComment: "Great work on the analysis!"          │
│       }                                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Google Classroom API processes                            │
│    → Stores grade on submission                              │
│    → Stores private comment                                  │
│    → Returns updated submission                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Teacher returns to student                                │
│    → Clicks "Return to Student"                              │
│    → POST /submissions/[id]/return                           │
│    → Changes state to RETURNED                               │
│    → Student can now see grade + comment in Google Classroom │
└─────────────────────────────────────────────────────────────┘
```

## 5. Testing Checklist

### Student Profile Testing

- [ ] Open assignment review modal
- [ ] Verify student list shows real names (not "Student 11405082")
- [ ] Verify student emails are displayed correctly
- [ ] Check placeholder fallback if API fails
- [ ] Test with multiple students in class
- [ ] Verify profile photos display (if available)

### Private Comments Testing

- [ ] **Enter Comment**: Type text in private comment field
- [ ] **Character Counter**: Verify counter updates (e.g., "45/500 characters")
- [ ] **Student Name Display**: Check student name appears in helper text
- [ ] **Save with Comment**: Enter grade + comment, click "Save Grade"
- [ ] **Verify API Call**: Check Network tab for PATCH request with `draftComment`
- [ ] **Save without Comment**: Save grade without entering comment (should work)
- [ ] **Character Limit**: Try typing 501+ characters (should be blocked)
- [ ] **Return to Student**: Click "Return to Student" after grading
- [ ] **Student View**: Have student check Google Classroom for private comment
- [ ] **Privacy Verification**: Confirm other students cannot see the comment

### Edge Cases

- [ ] Empty comment (should not send `draftComment` field)
- [ ] Comment with only whitespace (trimmed before sending)
- [ ] Comment with special characters (unicode, emoji)
- [ ] Comment with line breaks
- [ ] Updating grade without changing comment
- [ ] Network error during student profile fetch
- [ ] Network error during comment submission
- [ ] Large class size (100+ students)

## 6. Required OAuth Scopes

Ensure these scopes are configured in NextAuth:

```typescript
scope: [
  // ... other scopes
  "https://www.googleapis.com/auth/classroom.rosters",        // For student profiles
  "https://www.googleapis.com/auth/classroom.coursework.students", // For grading + comments
]
```

**Note**: The `classroom.coursework.students` scope was already required for grading, but now also enables private comments.

## 7. Troubleshooting

### Student Names Not Showing

**Symptom**: Still seeing "Student 11405082" instead of real names

**Solutions**:
1. Check OAuth scope includes `classroom.rosters` or `classroom.rosters.readonly`
2. Check browser console for API errors
3. Verify teacher has permission to view roster
4. Try re-authenticating with Google
5. Check if students are properly enrolled in the course

### Private Comments Not Visible to Students

**Symptom**: Student doesn't see comment in Google Classroom

**Solutions**:
1. Verify submission was **returned** to student (not just graded)
2. Check Network tab for successful PATCH response
3. Ensure `draftComment` field was included in request
4. Have student refresh Google Classroom page
5. Check if student is looking at correct assignment

### API Errors

**403 Permission Denied**:
- Missing OAuth scope
- User not enrolled as teacher
- Course access revoked

**404 Not Found**:
- Invalid courseId or submissionId
- Student or submission doesn't exist

**400 Bad Request**:
- Invalid comment format
- Comment exceeds 500 characters (shouldn't happen with UI validation)

## 8. Future Enhancements

Potential improvements for this feature:

1. **Rich Text Comments**: Support formatting (bold, italic, lists)
2. **Comment History**: Show previous comments on submissions
3. **Comment Templates**: Save frequently used feedback phrases
4. **Audio Comments**: Record voice feedback instead of typing
5. **File Attachments**: Attach example files to comments
6. **Comment Analytics**: Track which types of feedback improve grades
7. **Student Replies**: Allow students to respond to private comments
8. **Batch Comments**: Apply same comment to multiple students
9. **Auto-translate**: Translate comments to student's preferred language
10. **Comment Library**: Browse and reuse comments from past assignments

## 9. Best Practices

### For Teachers

1. **Be Specific**: Provide actionable feedback, not just "Good job"
2. **Balance Positive and Constructive**: Start with what they did well
3. **Reference Rubric**: Explain how grade relates to criteria
4. **Suggest Improvements**: Give concrete next steps
5. **Keep It Private**: Use comments for individual feedback, announcements for class-wide info
6. **Save Drafts**: Save grade before adding lengthy comments (system auto-saves)

### Example Comments

**Good Examples**:
- ✅ "Your introduction clearly stated the thesis. Consider adding more evidence in paragraph 3 to support your main argument."
- ✅ "Excellent use of primary sources! Next time, try to analyze the historical context more deeply."
- ✅ "Math work is correct, but showing your steps would help demonstrate your understanding."

**Poor Examples**:
- ❌ "Good" (too vague)
- ❌ "See me after class" (use announcements or email for this)
- ❌ "This is wrong" (not constructive)

## 10. Code References

### Key Files Modified

1. **`src/app/api/teacher/classrooms/[id]/students/route.ts`** (NEW)
   - Fetches student roster from Google Classroom
   - Maps userIds to profile information

2. **`src/components/teacher/AssignmentReviewModal.tsx`** (MODIFIED)
   - Added `commentInput` state
   - Updated `fetchStudentProfiles()` to call real API
   - Added private comment textarea in `SubmissionDetailView`
   - Sends `draftComment` in grade submission

3. **`src/app/api/teacher/classrooms/[id]/coursework/[workId]/submissions/[submissionId]/route.ts`** (MODIFIED)
   - PATCH handler now accepts `draftComment`
   - Includes comment in updateMask
   - Sends to Google Classroom API

### State Management

```typescript
// Component state
const [studentProfiles, setStudentProfiles] = useState<Map<string, UserProfile>>(new Map());
const [commentInput, setCommentInput] = useState('');

// Profile structure
interface UserProfile {
  id: string;
  name: { fullName: string };
  emailAddress: string;
  photoUrl?: string;
}
```

## 11. Google Classroom API Documentation

Official references:
- [students.list](https://developers.google.com/classroom/reference/rest/v1/courses.students/list)
- [studentSubmissions.patch](https://developers.google.com/classroom/reference/rest/v1/courses.courseWork.studentSubmissions/patch)
- [StudentSubmission resource](https://developers.google.com/classroom/reference/rest/v1/courses.courseWork.studentSubmissions#StudentSubmission)

## Summary

These features significantly improve the grading experience by:
1. **Humanizing the interface**: Real names instead of user IDs
2. **Enabling personalized feedback**: Private comments for each student
3. **Matching Google Classroom UX**: Familiar workflow for teachers
4. **Maintaining privacy**: Comments visible only to intended student

The implementation leverages Google Classroom's native APIs, ensuring compatibility and reliability with the existing platform.
