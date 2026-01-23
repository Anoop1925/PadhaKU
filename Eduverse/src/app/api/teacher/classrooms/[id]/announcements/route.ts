// API Route: Create Announcement
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const BASE_URL = 'https://classroom.googleapis.com/v1';

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
    const { text, materials } = body;

    if (!text) {
      return NextResponse.json({ error: 'Announcement text is required' }, { status: 400 });
    }

    const response = await fetch(`${BASE_URL}/courses/${courseId}/announcements`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        materials: materials || [],
        state: 'PUBLISHED',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create announcement');
    }

    const announcement = await response.json();
    return NextResponse.json({ announcement });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create announcement' },
      { status: 500 }
    );
  }
}
