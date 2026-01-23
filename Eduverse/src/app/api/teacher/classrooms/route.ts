// API Route: Teacher Classrooms
// Handles fetching and creating Google Classroom courses

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getTeacherCourses, createCourse, getCourseStudents } from '@/lib/googleClassroom';

// GET - Fetch all teacher courses
export async function GET(request: NextRequest) {
  try {
    console.log('[API] GET /api/teacher/classrooms - Fetching session...');
    const session = await getServerSession(authOptions);
    
    console.log('[API] Session exists:', !!session);
    console.log('[API] Session user:', session?.user?.email);
    console.log('[API] Access token exists:', !!session?.accessToken);
    
    if (!session?.accessToken) {
      console.error('[API] No access token in session');
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in again' },
        { status: 401 }
      );
    }

    console.log('[API] Calling getTeacherCourses...');
    const courses = await getTeacherCourses(session.accessToken as string);
    
    // Fetch student count for each course
    const coursesWithCounts = await Promise.all(
      courses.map(async (course) => {
        const students = await getCourseStudents(session.accessToken as string, course.id);
        return {
          id: course.id,
          name: course.name,
          section: course.section || '',
          enrollmentCode: course.enrollmentCode || '',
          studentCount: students.length,
          alternateLink: course.alternateLink,
          courseState: course.courseState,
          creationTime: course.creationTime,
        };
      })
    );

    console.log('[API] Returning', coursesWithCounts.length, 'courses');
    return NextResponse.json({ courses: coursesWithCounts });
  } catch (error) {
    console.error('[API] Error in GET /api/teacher/classrooms:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's an auth error
    if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
      return NextResponse.json(
        { error: 'Authentication expired. Please sign out and sign in again.' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch classrooms', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Create new course
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      console.error('No access token in session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, section, description, room } = body;

    console.log('Creating course with data:', { name, section, description, room });

    if (!name) {
      return NextResponse.json(
        { error: 'Course name is required' },
        { status: 400 }
      );
    }

    const course = await createCourse(session.accessToken as string, {
      name,
      section,
      description,
      room,
    });

    if (!course) {
      console.error('createCourse returned null');
      return NextResponse.json(
        { error: 'Failed to create course - API returned no data' },
        { status: 500 }
      );
    }

    console.log('Course created successfully:', course.id);
    return NextResponse.json({ course });
  } catch (error) {
    console.error('Error creating classroom (full error):', error);
    
    // Pass through the detailed error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to create classroom';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
