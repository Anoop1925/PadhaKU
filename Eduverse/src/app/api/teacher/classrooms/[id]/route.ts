// API Route: Individual Classroom Detail
// Fetches comprehensive data for a specific classroom

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const BASE_URL = 'https://classroom.googleapis.com/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: courseId } = await params;
    const accessToken = session.accessToken as string;

    // Fetch all data in parallel
    const [courseRes, studentsRes, announcementsRes, courseWorkRes, topicsRes] = await Promise.all([
      fetch(`${BASE_URL}/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${BASE_URL}/courses/${courseId}/students`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${BASE_URL}/courses/${courseId}/announcements?pageSize=20`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${BASE_URL}/courses/${courseId}/courseWork`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${BASE_URL}/courses/${courseId}/topics`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    const course = await courseRes.json();
    const studentsData = await studentsRes.json();
    const announcementsData = await announcementsRes.json();
    const courseWorkData = await courseWorkRes.json();
    const topicsData = await topicsRes.json();

    return NextResponse.json({
      classroom: {
        id: course.id,
        name: course.name,
        section: course.section || '',
        enrollmentCode: course.enrollmentCode || '',
        description: course.descriptionHeading || '',
        room: course.room || '',
        alternateLink: course.alternateLink,
      },
      students: studentsData.students || [],
      announcements: announcementsData.announcements || [],
      courseWork: courseWorkData.courseWork || [],
      topics: topicsData.topics || [],
    });
  } catch (error) {
    console.error('Error fetching classroom detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classroom detail' },
      { status: 500 }
    );
  }
}
