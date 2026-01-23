// API Route: Teacher Dashboard Data
// Fetches comprehensive dashboard statistics from Google Classroom

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  getTeacherCourses,
  getTotalStudentsCount,
  getAllCourseWork,
  getRecentActivity,
  getUpcomingDeadlines,
} from '@/lib/googleClassroom';

export async function GET(request: NextRequest) {
  try {
    // Get session with access token
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No access token found' },
        { status: 401 }
      );
    }

    const accessToken = session.accessToken as string;

    // Fetch all teacher courses
    const courses = await getTeacherCourses(accessToken);
    const courseIds = courses.map(c => c.id);

    if (courseIds.length === 0) {
      return NextResponse.json({
        totalClasses: 0,
        totalStudents: 0,
        activeAssignments: 0,
        upcomingTests: 0,
        recentActivity: [],
        upcomingDeadlines: [],
        courses: [],
      });
    }

    // Fetch all data in parallel for better performance
    const [
      totalStudents,
      allCourseWork,
      recentActivity,
      upcomingDeadlines,
    ] = await Promise.all([
      getTotalStudentsCount(accessToken, courseIds),
      getAllCourseWork(accessToken, courseIds),
      getRecentActivity(accessToken, courseIds),
      getUpcomingDeadlines(accessToken, courseIds),
    ]);

    // Calculate active assignments (published and not yet graded)
    const now = new Date();
    const activeAssignments = allCourseWork.filter(work => {
      if (work.state !== 'PUBLISHED') return false;
      
      // If has due date, check if it's in the future
      if (work.dueDate) {
        const dueDate = new Date(
          work.dueDate.year,
          work.dueDate.month - 1,
          work.dueDate.day
        );
        return dueDate >= now;
      }
      
      // If no due date, consider it active
      return true;
    }).length;

    // Count upcoming tests (assignments with "test", "quiz", "exam" in title)
    const testKeywords = ['test', 'quiz', 'exam', 'assessment'];
    const upcomingTests = allCourseWork.filter(work => {
      if (work.state !== 'PUBLISHED') return false;
      
      const titleLower = work.title.toLowerCase();
      const hasTestKeyword = testKeywords.some(keyword => titleLower.includes(keyword));
      
      if (!hasTestKeyword) return false;
      
      // Check if in future
      if (work.dueDate) {
        const dueDate = new Date(
          work.dueDate.year,
          work.dueDate.month - 1,
          work.dueDate.day
        );
        return dueDate >= now;
      }
      
      return true;
    }).length;

    // Return dashboard data
    return NextResponse.json({
      totalClasses: courses.length,
      totalStudents,
      activeAssignments,
      upcomingTests,
      recentActivity,
      upcomingDeadlines,
      courses: courses.map(c => ({
        id: c.id,
        name: c.name,
        section: c.section,
        enrollmentCode: c.enrollmentCode,
        alternateLink: c.alternateLink,
      })),
    });
  } catch (error) {
    console.error('Error fetching teacher dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
