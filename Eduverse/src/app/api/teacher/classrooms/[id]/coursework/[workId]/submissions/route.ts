// API Route: List Student Submissions for Assignment
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const BASE_URL = 'https://classroom.googleapis.com/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: courseId, workId } = await params;

    // Fetch all student submissions for this assignment
    const response = await fetch(
      `${BASE_URL}/courses/${courseId}/courseWork/${workId}/studentSubmissions?pageSize=100`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Google Classroom API error:', error);
      throw new Error(error.error?.message || 'Failed to fetch submissions');
    }

    const data = await response.json();
    return NextResponse.json({ submissions: data.studentSubmissions || [] });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
