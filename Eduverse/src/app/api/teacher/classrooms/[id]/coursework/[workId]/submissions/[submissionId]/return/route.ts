// API Route: Return Graded Submission
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const BASE_URL = 'https://classroom.googleapis.com/v1';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workId: string; submissionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: courseId, workId, submissionId } = await params;

    // Return submission to student
    const response = await fetch(
      `${BASE_URL}/courses/${courseId}/courseWork/${workId}/studentSubmissions/${submissionId}:return`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Google Classroom API error:', error);
      throw new Error(error.error?.message || 'Failed to return submission');
    }

    const submission = await response.json();
    return NextResponse.json({ submission });
  } catch (error) {
    console.error('Error returning submission:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to return submission' },
      { status: 500 }
    );
  }
}
