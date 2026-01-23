// API Route: Create Course Work
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createCourseWork } from '@/lib/googleClassroom';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const courseId = params.id;
    const body = await request.json();
    const { title, description, dueDate, maxPoints, workType } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const dueDateObj = dueDate ? new Date(dueDate) : undefined;

    const courseWork = await createCourseWork(
      session.accessToken as string,
      courseId,
      {
        title,
        description,
        dueDate: dueDateObj,
        maxPoints: maxPoints ? parseInt(maxPoints) : undefined,
        workType: workType || 'ASSIGNMENT',
      }
    );

    if (!courseWork) {
      return NextResponse.json({ error: 'Failed to create course work' }, { status: 500 });
    }

    return NextResponse.json({ courseWork });
  } catch (error) {
    console.error('Error creating course work:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create course work' },
      { status: 500 }
    );
  }
}
