import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No access token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 }
      );
    }

    // Fetch both students and teachers
    const [studentsResponse, teachersResponse] = await Promise.all([
      fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/students`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      ),
      fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/teachers`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      ),
    ]);

    if (!studentsResponse.ok || !teachersResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch class members' },
        { status: 500 }
      );
    }

    const students = await studentsResponse.json();
    const teachers = await teachersResponse.json();

    return NextResponse.json({
      students: students.students || [],
      teachers: teachers.teachers || [],
    });
  } catch (error) {
    console.error('Error fetching class members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
