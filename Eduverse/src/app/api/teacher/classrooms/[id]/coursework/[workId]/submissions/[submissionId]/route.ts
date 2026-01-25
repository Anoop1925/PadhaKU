// API Route: Get/Update Single Submission
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const BASE_URL = 'https://classroom.googleapis.com/v1';

// GET: Fetch specific submission details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workId: string; submissionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: courseId, workId, submissionId } = await params;

    const response = await fetch(
      `${BASE_URL}/courses/${courseId}/courseWork/${workId}/studentSubmissions/${submissionId}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch submission');
    }

    const submission = await response.json();
    return NextResponse.json({ submission });
  } catch (error) {
    console.error('Error fetching submission:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch submission' },
      { status: 500 }
    );
  }
}

// PATCH: Grade submission (update assignedGrade and draftGrade)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workId: string; submissionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: courseId, workId, submissionId } = await params;
    const body = await request.json();
    const { assignedGrade, draftGrade } = body;

    // Prepare update body
    const updateBody: any = {};
    
    if (assignedGrade !== undefined) {
      updateBody.assignedGrade = assignedGrade;
    }
    
    if (draftGrade !== undefined) {
      updateBody.draftGrade = draftGrade;
    }

    // Note: draftComment is not supported by Google Classroom API
    // Private comments must be added through Google Classroom UI

    // Update submission
    const response = await fetch(
      `${BASE_URL}/courses/${courseId}/courseWork/${workId}/studentSubmissions/${submissionId}?updateMask=${Object.keys(updateBody).join(',')}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateBody),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Google Classroom API error:', error);
      throw new Error(error.error?.message || 'Failed to update grade');
    }

    const submission = await response.json();
    return NextResponse.json({ submission });
  } catch (error) {
    console.error('Error grading submission:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to grade submission' },
      { status: 500 }
    );
  }
}
