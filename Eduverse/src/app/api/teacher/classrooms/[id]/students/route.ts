import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const BASE_URL = 'https://classroom.googleapis.com/v1';

/**
 * GET /api/teacher/classrooms/[id]/students
 * 
 * Fetches the list of students enrolled in a course.
 * 
 * Google Classroom API Reference:
 * https://developers.google.com/classroom/reference/rest/v1/courses.students/list
 * 
 * Required OAuth scope:
 * - https://www.googleapis.com/auth/classroom.rosters.readonly
 * - OR https://www.googleapis.com/auth/classroom.rosters
 * 
 * Returns:
 * {
 *   students: [
 *     {
 *       courseId: string,
 *       userId: string,
 *       profile: {
 *         id: string,
 *         name: { givenName: string, familyName: string, fullName: string },
 *         emailAddress: string,
 *         photoUrl?: string
 *       }
 *     }
 *   ]
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    // Get the user's session
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // Fetch students list from Google Classroom API
    const response = await fetch(
      `${BASE_URL}/courses/${courseId}/students?pageSize=100`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Classroom API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      if (response.status === 401) {
        return NextResponse.json(
          { 
            error: 'Authentication expired. Please sign in again.',
            needsReauth: true 
          },
          { status: 401 }
        );
      }

      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Permission denied. You may not have access to view students in this course.' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch students from Google Classroom' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      students: data.students || [],
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching students' },
      { status: 500 }
    );
  }
}
