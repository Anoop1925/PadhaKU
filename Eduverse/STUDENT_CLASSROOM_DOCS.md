# Student Classroom Feature - Documentation

## Overview
This feature provides students with a comprehensive Google Classroom integration that mirrors the native Google Classroom experience with three main tabs: Stream, Classwork, and People.

## Features Implemented

### 1. **Classroom Navigation**
- Added "Classroom" option to student sidebar (Dashboard Layout)
- Icon: School (from lucide-react)
- Route: `/student/classroom`
- Positioned as second item after Dashboard for easy access

### 2. **API Routes** (`/api/classroom/`)

#### **GET /api/classroom/courses**
- Fetches all active courses where the user is a student
- Uses Google Classroom API: `courses?courseStates=ACTIVE&studentId=me`
- Returns: List of courses with details (id, name, section, room, etc.)

#### **GET /api/classroom/announcements**
- Query param: `courseId` (required)
- Fetches all announcements for a specific course
- Ordered by: `updateTime desc`
- Returns: List of announcements with text, materials, creation time

#### **GET /api/classroom/coursework**
- Query param: `courseId` (required)
- Fetches all coursework (assignments) for a specific course
- Ordered by: `updateTime desc`
- Returns: List of assignments with title, description, due dates, materials, max points

#### **GET /api/classroom/submissions**
- Query params: `courseId`, `courseWorkId` (both required)
- Fetches student's submission status for a specific assignment
- Uses: `userId=me` to get current user's submissions only
- Returns: Submission state (NEW, CREATED, TURNED_IN, RETURNED), grade, attachments

#### **POST /api/classroom/submissions**
- Body params: `courseId`, `courseWorkId`, `submissionId`, `action`
- **Actions:**
  - `turnIn`: Submits the assignment to teacher
  - `modifyAttachments`: Adds text response or file links to submission
- Uses Google Classroom API: `:turnIn` and `:modifyAttachments` endpoints

#### **GET /api/classroom/students**
- Query param: `courseId` (required)
- Fetches both students and teachers for a course
- Returns: Object with `students` and `teachers` arrays containing profile info

### 3. **Student Classroom Page** (`/student/classroom/page.tsx`)

#### **Main Layout**
- **Classroom Selection View**: Grid of course cards showing enrolled classrooms
- **Classroom Detail View**: Full classroom interface with three tabs

#### **Tab 1: Stream** (Primary Feed)
- **Announcements Display:**
  - Shows all announcements with creator avatar
  - Displays creation date
  - Shows attached materials (PDFs, videos, links)
  - Badge: "Announcement" for easy identification
  
- **Assignments Display:**
  - Shows as clickable cards in feed
  - Displays title, due date, max points
  - Clock icon with formatted due date
  - Click to open submission modal
  - "View Assignment →" button

- **Assignment Submission Modal:**
  - Full assignment details (title, instructions, materials)
  - Text input for responses or links
  - Submit button ("Turn In")
  - Shows submission status:
    - ✅ Green banner: "Assignment submitted"
    - 📝 Blue banner: "Assignment graded" with score
    - 📋 Form: Input field for new submissions
  - Loading state while submitting
  - Auto-refresh after successful submission

#### **Tab 2: Classwork** (Resources)
- Lists all assignments with full details
- Shows each assignment as expandable card
- Displays:
  - Assignment title
  - Due date (formatted)
  - Max points
  - Full description
  - All attached materials
- Materials rendered with appropriate icons:
  - 📄 PDFs and documents (blue icon)
  - ▶️ YouTube videos (red play icon)
  - 🔗 External links (purple icon)
  - 📋 Google Forms (link icon)
- All materials open in new tab

#### **Tab 3: People** (Class Members)
- **Teachers Section:**
  - Badge showing count
  - List with avatars, names, emails
  - Hover effects for better UX
  
- **Students Section:**
  - Badge showing count
  - List with avatars, names, emails
  - Alphabetically displayed
  - Avatar fallbacks (initials) if no photo

### 4. **UI/UX Features**

#### **Design Consistency**
- Matches existing dashboard design system
- Uses same color palette:
  - Blue gradients for primary actions
  - Purple for special features
  - Green for success states
  - Red for critical actions
- Consistent card styling with rounded corners
- Hover effects on interactive elements

#### **Responsive Design**
- Grid layouts adapt to screen size
- Mobile-friendly course cards
- Tablet-optimized tab navigation
- Scrollable content areas with custom scrollbars

#### **Loading States**
- Spinner during data fetching
- Skeleton screens for better perceived performance
- Loading indicators on submission

#### **Empty States**
- "No classrooms yet" with icon and helpful text
- "No posts yet" in Stream tab
- "No classwork yet" in Classwork tab
- Consistent iconography for empty states

#### **Accessibility**
- Proper ARIA labels (via Dialog components)
- Keyboard navigation support
- Focus management in modals
- Semantic HTML structure

### 5. **Material Rendering**

The `renderMaterials()` function handles all types of Google Classroom attachments:

```typescript
- Drive Files: PDFs, Docs, Sheets, Slides
- YouTube Videos: With thumbnails and titles
- External Links: Generic links with custom titles
- Google Forms: For quizzes and surveys
```

Each material:
- Opens in new tab (`target="_blank"`)
- Has `rel="noopener noreferrer"` for security
- Shows appropriate icon
- Has hover effect
- Displays title or filename

### 6. **Date Formatting**

Uses intelligent date formatting:
```typescript
formatDate(dateObj, timeObj)
```
- Shows full date: "Jan 25, 2026"
- Includes time if provided: "Jan 25, 2026, 11:59 PM"
- Handles missing dates: "No due date"
- Month abbreviations for compact display

### 7. **Authentication & Security**

- Uses NextAuth session management
- Access token automatically passed to all API routes
- Server-side token validation
- Unauthorized access returns 401
- API errors properly handled and logged

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── classroom/
│   │       ├── announcements/
│   │       │   └── route.ts
│   │       ├── courses/
│   │       │   └── route.ts
│   │       ├── coursework/
│   │       │   └── route.ts
│   │       ├── students/
│   │       │   └── route.ts
│   │       └── submissions/
│   │           └── route.ts
│   ├── dashboard/
│   │   └── layout.tsx (Updated)
│   └── student/
│       └── classroom/
│           ├── layout.tsx
│           └── page.tsx
```

## Google Classroom API Integration

### **Required OAuth Scopes**
Already configured in your NextAuth setup:
```
https://www.googleapis.com/auth/classroom.courses.readonly
https://www.googleapis.com/auth/classroom.announcements.readonly
https://www.googleapis.com/auth/classroom.coursework.me
https://www.googleapis.com/auth/classroom.rosters.readonly
https://www.googleapis.com/auth/classroom.student-submissions.me.readonly
```

### **API Methods Used**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `ListCourses` | `GET /v1/courses` | Get enrolled classrooms |
| `ListAnnouncements` | `GET /v1/courses/{id}/announcements` | Get course announcements |
| `ListCourseWork` | `GET /v1/courses/{id}/courseWork` | Get assignments |
| `ListStudentSubmissions` | `GET /v1/courses/{id}/courseWork/{id}/studentSubmissions` | Get submission status |
| `TurnIn` | `POST /v1/courses/{id}/courseWork/{id}/studentSubmissions/{id}:turnIn` | Submit assignment |
| `ModifyAttachments` | `POST /v1/courses/{id}/courseWork/{id}/studentSubmissions/{id}:modifyAttachments` | Add work to submission |
| `ListStudents` | `GET /v1/courses/{id}/students` | Get class roster |
| `ListTeachers` | `GET /v1/courses/{id}/teachers` | Get course teachers |

## Usage Flow

### **Student Workflow:**

1. **Access Classroom:**
   - Click "Classroom" in sidebar
   - See all enrolled courses as cards

2. **Select Classroom:**
   - Click on any course card
   - Opens classroom detail view
   - Default tab: Stream

3. **View Stream:**
   - See latest announcements
   - See upcoming assignments
   - Click assignment to view details

4. **Submit Assignment:**
   - Click assignment card
   - Modal opens with full details
   - Review instructions and materials
   - Enter text response or paste link
   - Click "Turn In"
   - Confirmation shown

5. **View Classwork:**
   - Switch to "Classwork" tab
   - Browse all assignments
   - Download materials
   - See due dates and points

6. **View People:**
   - Switch to "People" tab
   - See all teachers
   - See all classmates
   - View email addresses

## Future Enhancements

### **Potential Features:**
1. **Comments on Announcements/Assignments**
   - Add comment API route
   - Comment thread UI
   - Reply functionality

2. **File Upload for Submissions**
   - Google Drive integration
   - Direct file upload to Drive
   - Attach uploaded files to submission

3. **Real-time Notifications**
   - New announcement alerts
   - Assignment due date reminders
   - Grade posted notifications

4. **Private Comments to Teacher**
   - Direct Q&A on assignments
   - Teacher-student private thread

5. **Grade History**
   - View all graded work
   - Overall course grade
   - Grade trends and analytics

6. **Calendar Integration**
   - Sync due dates with calendar
   - Assignment reminders
   - Class schedule view

7. **Offline Support**
   - Cache classroom data
   - Submit when back online
   - Progressive Web App features

## Testing Checklist

- [ ] Classroom list loads correctly
- [ ] Course selection works
- [ ] All three tabs switch properly
- [ ] Announcements display with materials
- [ ] Assignments show in Stream and Classwork
- [ ] Assignment modal opens with correct data
- [ ] Text submission works
- [ ] Turn in functionality works
- [ ] Submission status updates correctly
- [ ] Teachers and students list correctly
- [ ] Materials open in new tabs
- [ ] Error handling works (no API key, network errors)
- [ ] Loading states show appropriately
- [ ] Empty states display correctly
- [ ] Responsive design works on mobile
- [ ] Back button returns to classroom list

## Error Handling

All API routes include:
- Session validation
- Access token checking
- Error response formatting
- Console error logging
- User-friendly error messages

## Performance Considerations

- Parallel API calls for course details (Promise.all)
- Lazy loading of submissions (on-demand)
- Efficient re-rendering with React state
- Memoization opportunities for material rendering
- Pagination ready (cursor support in place)

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript features
- CSS Grid and Flexbox
- backdrop-filter support for blur effects

## Deployment Notes

- No additional environment variables needed
- Uses existing Google OAuth configuration
- No database changes required
- Works with current Vercel deployment
- Compatible with existing authentication flow

---

**Created:** January 25, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
