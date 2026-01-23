// Google Classroom API Service Layer
// Provides typed functions to interact with Google Classroom API

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  description?: string;
  room?: string;
  ownerId: string;
  creationTime: string;
  updateTime: string;
  enrollmentCode?: string;
  courseState: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED';
  alternateLink: string;
  teacherGroupEmail?: string;
  courseGroupEmail?: string;
  guardiansEnabled?: boolean;
  calendarId?: string;
}

export interface Student {
  courseId: string;
  userId: string;
  profile: {
    id: string;
    name: {
      givenName: string;
      familyName: string;
      fullName: string;
    };
    emailAddress: string;
    photoUrl?: string;
  };
}

export interface CourseWork {
  courseId: string;
  id: string;
  title: string;
  description?: string;
  materials?: any[];
  state: 'PUBLISHED' | 'DRAFT' | 'DELETED';
  alternateLink: string;
  creationTime: string;
  updateTime: string;
  dueDate?: {
    year: number;
    month: number;
    day: number;
  };
  dueTime?: {
    hours: number;
    minutes: number;
  };
  maxPoints?: number;
  workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
  assigneeMode: 'ALL_STUDENTS' | 'INDIVIDUAL_STUDENTS';
  submissionModificationMode?: 'MODIFIABLE_UNTIL_TURNED_IN' | 'MODIFIABLE';
  creatorUserId: string;
}

export interface StudentSubmission {
  courseId: string;
  courseWorkId: string;
  id: string;
  userId: string;
  creationTime: string;
  updateTime: string;
  state: 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT';
  late?: boolean;
  draftGrade?: number;
  assignedGrade?: number;
  alternateLink: string;
  courseWorkType: string;
  assignmentSubmission?: {
    attachments?: any[];
  };
  shortAnswerSubmission?: {
    answer?: string;
  };
  multipleChoiceSubmission?: {
    answer?: string;
  };
}

export interface Announcement {
  courseId: string;
  id: string;
  text: string;
  materials?: any[];
  state: 'PUBLISHED' | 'DRAFT' | 'DELETED';
  alternateLink: string;
  creationTime: string;
  updateTime: string;
  scheduledTime?: string;
  assigneeMode: 'ALL_STUDENTS' | 'INDIVIDUAL_STUDENTS';
  individualStudentsOptions?: {
    studentIds: string[];
  };
  creatorUserId: string;
}

export interface Topic {
  courseId: string;
  topicId: string;
  name: string;
  updateTime: string;
}

const BASE_URL = 'https://classroom.googleapis.com/v1';

/**
 * Fetch all courses where the user is a teacher
 */
export async function getTeacherCourses(accessToken: string): Promise<ClassroomCourse[]> {
  try {
    console.log('[GoogleClassroom] Fetching teacher courses...');
    console.log('[GoogleClassroom] Access token present:', !!accessToken);
    console.log('[GoogleClassroom] Access token length:', accessToken?.length || 0);

    const response = await fetch(`${BASE_URL}/courses?teacherId=me&courseStates=ACTIVE`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[GoogleClassroom] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[GoogleClassroom] Error response:', errorBody);
      throw new Error(`Failed to fetch courses: ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    console.log('[GoogleClassroom] Fetched', data.courses?.length || 0, 'courses');
    return data.courses || [];
  } catch (error) {
    console.error('[GoogleClassroom] Error fetching teacher courses:', error);
    throw error; // Re-throw to let caller handle it
  }
}

/**
 * Get total count of students across all courses
 */
export async function getTotalStudentsCount(accessToken: string, courseIds: string[]): Promise<number> {
  try {
    let totalStudents = 0;
    
    // Fetch students for each course in parallel
    const studentPromises = courseIds.map(courseId =>
      fetch(`${BASE_URL}/courses/${courseId}/students`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).then(res => res.json())
    );

    const results = await Promise.all(studentPromises);
    
    results.forEach(data => {
      if (data.students) {
        totalStudents += data.students.length;
      }
    });

    return totalStudents;
  } catch (error) {
    console.error('Error fetching students count:', error);
    return 0;
  }
}

/**
 * Get all course work (assignments) across courses
 */
export async function getAllCourseWork(accessToken: string, courseIds: string[]): Promise<CourseWork[]> {
  try {
    const courseWorkPromises = courseIds.map(courseId =>
      fetch(`${BASE_URL}/courses/${courseId}/courseWork`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).then(res => res.json())
    );

    const results = await Promise.all(courseWorkPromises);
    
    const allCourseWork: CourseWork[] = [];
    results.forEach(data => {
      if (data.courseWork) {
        allCourseWork.push(...data.courseWork);
      }
    });

    return allCourseWork;
  } catch (error) {
    console.error('Error fetching course work:', error);
    return [];
  }
}

/**
 * Get students for a specific course
 */
export async function getCourseStudents(accessToken: string, courseId: string): Promise<Student[]> {
  try {
    const response = await fetch(`${BASE_URL}/courses/${courseId}/students`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch students: ${response.statusText}`);
    }

    const data = await response.json();
    return data.students || [];
  } catch (error) {
    console.error('Error fetching course students:', error);
    return [];
  }
}

/**
 * Get submissions for a course work
 */
export async function getCourseWorkSubmissions(
  accessToken: string,
  courseId: string,
  courseWorkId: string
): Promise<StudentSubmission[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch submissions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.studentSubmissions || [];
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }
}

/**
 * Get announcements for a course
 */
export async function getCourseAnnouncements(accessToken: string, courseId: string): Promise<Announcement[]> {
  try {
    const response = await fetch(`${BASE_URL}/courses/${courseId}/announcements`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch announcements: ${response.statusText}`);
    }

    const data = await response.json();
    return data.announcements || [];
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }
}

/**
 * Get recent activity across all courses (submissions, grades, etc.)
 */
export async function getRecentActivity(accessToken: string, courseIds: string[]) {
  try {
    const activities: any[] = [];

    // Fetch recent course work and their submissions
    for (const courseId of courseIds.slice(0, 3)) { // Limit to first 3 courses for performance
      const courseWorkResponse = await fetch(`${BASE_URL}/courses/${courseId}/courseWork?pageSize=5`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const courseWorkData = await courseWorkResponse.json();
      const courseWork = courseWorkData.courseWork || [];

      // Get course name
      const courseResponse = await fetch(`${BASE_URL}/courses/${courseId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const course = await courseResponse.json();

      for (const work of courseWork.slice(0, 2)) { // Get 2 most recent per course
        const submissionsResponse = await fetch(
          `${BASE_URL}/courses/${courseId}/courseWork/${work.id}/studentSubmissions?pageSize=10`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const submissionsData = await submissionsResponse.json();
        const submissions = submissionsData.studentSubmissions || [];

        // Get recent submissions
        const recentSubmissions = submissions
          .filter((s: StudentSubmission) => s.state === 'TURNED_IN' || s.assignedGrade !== undefined)
          .slice(0, 3);

        for (const submission of recentSubmissions) {
          activities.push({
            id: submission.id,
            type: submission.assignedGrade !== undefined ? 'grade' : 'submission',
            courseName: course.name,
            courseWorkTitle: work.title,
            userId: submission.userId,
            time: submission.updateTime,
            grade: submission.assignedGrade,
            state: submission.state,
          });
        }
      }
    }

    // Sort by time and return most recent
    return activities.sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    ).slice(0, 10);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}

/**
 * Get upcoming deadlines across all courses
 */
export async function getUpcomingDeadlines(accessToken: string, courseIds: string[]) {
  try {
    const now = new Date();
    const upcomingWork: any[] = [];

    for (const courseId of courseIds) {
      const courseWorkResponse = await fetch(`${BASE_URL}/courses/${courseId}/courseWork`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const courseWorkData = await courseWorkResponse.json();
      const courseWork = courseWorkData.courseWork || [];

      // Get course name
      const courseResponse = await fetch(`${BASE_URL}/courses/${courseId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const course = await courseResponse.json();

      for (const work of courseWork) {
        if (work.dueDate) {
          const dueDate = new Date(
            work.dueDate.year,
            work.dueDate.month - 1,
            work.dueDate.day,
            work.dueTime?.hours || 23,
            work.dueTime?.minutes || 59
          );

          // Only include future deadlines
          if (dueDate > now) {
            upcomingWork.push({
              id: work.id,
              title: work.title,
              courseName: course.name,
              dueDate: dueDate.toISOString(),
              courseId: courseId,
            });
          }
        }
      }
    }

    // Sort by due date and return upcoming
    return upcomingWork
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 10);
  } catch (error) {
    console.error('Error fetching upcoming deadlines:', error);
    return [];
  }
}

/**
 * Create a new course
 */
export async function createCourse(
  accessToken: string,
  courseData: {
    name: string;
    section?: string;
    description?: string;
    room?: string;
  }
): Promise<ClassroomCourse | null> {
  try {
    console.log('Attempting to create course:', courseData);
    
    // Try without specifying courseState first (let Google decide)
    const response = await fetch(`${BASE_URL}/courses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: courseData.name,
        section: courseData.section,
        descriptionHeading: courseData.description,
        room: courseData.room,
        ownerId: 'me',
        // Removed courseState - will use default PROVISIONED state
      }),
    });

    console.log('Course creation response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('Google Classroom API error:', error);
      
      // Provide more helpful error messages
      if (error.error?.code === 403) {
        if (error.error?.message?.includes('CourseStateDenied')) {
          throw new Error('Your Google account does not have permission to create courses. Please use a Google Workspace for Education account or create the course manually in Google Classroom and it will appear here.');
        }
        throw new Error('Permission denied. You may need to use a Google Workspace for Education account.');
      }
      
      throw new Error(`Failed to create course: ${error.error?.message || response.statusText}`);
    }

    const course = await response.json();
    console.log('Course created successfully:', course);
    return course;
  } catch (error) {
    console.error('Error creating course:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    throw error; // Re-throw to propagate the detailed error message
  }
}

/**
 * Create course work (assignment)
 */
export async function createCourseWork(
  accessToken: string,
  courseId: string,
  workData: {
    title: string;
    description?: string;
    dueDate?: Date;
    maxPoints?: number;
    workType?: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
  }
): Promise<CourseWork | null> {
  try {
    const body: any = {
      title: workData.title,
      description: workData.description,
      workType: workData.workType || 'ASSIGNMENT',
      state: 'PUBLISHED',
      maxPoints: workData.maxPoints,
    };

    if (workData.dueDate) {
      body.dueDate = {
        year: workData.dueDate.getFullYear(),
        month: workData.dueDate.getMonth() + 1,
        day: workData.dueDate.getDate(),
      };
      body.dueTime = {
        hours: workData.dueDate.getHours(),
        minutes: workData.dueDate.getMinutes(),
      };
    }

    const response = await fetch(`${BASE_URL}/courses/${courseId}/courseWork`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create course work: ${error.error?.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating course work:', error);
    return null;
  }
}
