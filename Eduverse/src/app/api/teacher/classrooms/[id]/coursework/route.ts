// API Route: Create Course Work
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createCourseWork } from '@/lib/googleClassroom';

const BASE_URL = 'https://classroom.googleapis.com/v1';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: courseId } = await params;
    const body = await request.json();
    const { title, description, dueDate, maxPoints, workType, materials } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Parse date and ensure it's in the future
    let dueDateObj: Date | undefined = undefined;
    if (dueDate) {
      dueDateObj = new Date(dueDate);
      // Ensure the date is at least tomorrow
      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (dueDateObj < tomorrow) {
        return NextResponse.json({ error: 'Due date must be in the future. Please select tomorrow or a later date.' }, { status: 400 });
      }
    }

    const courseWork = await createCourseWork(
      session.accessToken as string,
      courseId,
      {
        title,
        description,
        dueDate: dueDateObj,
        maxPoints: maxPoints ? parseInt(maxPoints) : undefined,
        workType: workType || 'ASSIGNMENT',
        materials: materials || undefined,
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
