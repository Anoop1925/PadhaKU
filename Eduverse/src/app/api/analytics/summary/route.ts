import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface ChapterMark {
  chapterIndex: number;
  chapterName: string;
  score: number;
  courseName: string;
  courseId: number;
  completedAt: string;
}

interface AnalyticsSummary {
  currentStatus: {
    level: number;
    tier: string;
    totalPoints: number;
    rank: number | null;
    streak: number;
    consistency: number;
  };
  progressTrends: {
    last7Days: { date: string; points: number; chapters: number }[];
    last30Days: { date: string; points: number; chapters: number }[];
  };
  strengthsAndWeaknesses: {
    strongCategories: { category: string; completionRate: number; chaptersCompleted: number }[];
    weakCategories: { category: string; completionRate: number; chaptersStarted: number }[];
  };
  engagementSummary: {
    totalActiveDays: number;
    averagePointsPerDay: number;
    mostProductiveDay: string;
    totalCoursesStarted: number;
    totalCoursesCompleted: number;
    totalChaptersCompleted: number;
  };
  recommendation: {
    action: string;
    reason: string;
    suggestedCourse: string | null;
  };
  chapterWiseMarks: ChapterMark[];
  userCourses: { id: number; title: string; chaptersCompleted: number; totalChapters: number }[];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get("userEmail");

    if (!userEmail) {
      return NextResponse.json(
        { error: "Missing userEmail" },
        { status: 400 }
      );
    }

    console.log('Analytics API: Fetching data for user:', userEmail);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user points
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (pointsError && pointsError.code !== 'PGRST116') {
      console.error('Points query error:', pointsError);
    }
    console.log('User points:', userPoints);

    // Fetch points history
    const { data: pointsHistory, error: historyError } = await supabase
      .from('points_history')
      .select('*')
      .eq('user_email', userEmail)
      .order('earned_at', { ascending: false });

    if (historyError) {
      console.error('History query error:', historyError);
    }
    console.log('Points history count:', pointsHistory?.length || 0);

    // Fetch user progress (without join first)
    const { data: userProgress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_email', userEmail);

    if (progressError) {
      console.error('Progress query error:', progressError);
    }
    console.log('User progress count:', userProgress?.length || 0);

    // Fetch all courses separately
    const { data: allCourses, error: coursesError } = await supabase
      .from('courses')
      .select('*');

    if (coursesError) {
      console.error('Courses query error:', coursesError);
    }
    console.log('Total courses count:', allCourses?.length || 0);

  // Get courses the user is actually taking (has progress in)
  const userCourseIds = new Set(userProgress?.map(p => p.course_id) || []);
  const userCourses = allCourses?.filter(c => userCourseIds.has(c.id)) || [];
  console.log('User courses (with progress) count:', userCourses.length);
  console.log('User course IDs:', Array.from(userCourseIds));
  console.log('Sample course data:', userCourses[0]);

    // Create a map of course_id to course data
    const coursesMap = new Map();
    allCourses?.forEach(course => {
      coursesMap.set(course.id, course);
    });

    // Enrich user progress with course data
    const enrichedProgress = userProgress?.map(progress => ({
      ...progress,
      courses: coursesMap.get(progress.course_id) || null
    })) || [];

    // Fetch leaderboard for rank
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from('user_points')
      .select('user_email, points')
      .order('points', { ascending: false });

    if (leaderboardError) {
      console.error('Leaderboard query error:', leaderboardError);
    }

    const totalPoints = userPoints?.points || 0;
    const totalChaptersCompleted = userPoints?.total_chapters_completed || 0;
    const totalCoursesCompleted = userPoints?.total_courses_completed || 0;

    console.log('Stats:', { totalPoints, totalChaptersCompleted, totalCoursesCompleted });

    // Calculate rank
    let userRank: number | null = null;
    if (leaderboard && leaderboard.length > 0) {
      const rankIndex = leaderboard.findIndex(u => u.user_email === userEmail);
      userRank = rankIndex >= 0 ? rankIndex + 1 : null;
      console.log('Rank calculation:', { rankIndex, userRank, totalUsers: leaderboard.length });
    }

    // Calculate level and tier
    const level = Math.floor(totalPoints / 100) + 1;
    const tier = totalPoints < 100 ? 'Beginner' : 
                 totalPoints < 500 ? 'Intermediate' : 
                 totalPoints < 1000 ? 'Advanced' : 'Expert';

    // Calculate streak (consecutive days with activity)
    const streak = calculateStreak(pointsHistory || []);

    // Calculate consistency (percentage of days active in last 30 days)
    const consistency = calculateConsistency(pointsHistory || []);

    // Progress trends
    const progressTrends = calculateProgressTrends(pointsHistory || []);

    // Strengths and weaknesses by category
    const { strongCategories, weakCategories } = analyzeCategories(enrichedProgress, userCourses);

    // Engagement summary
    const engagementSummary = calculateEngagement(pointsHistory || [], userCourses, totalCoursesCompleted, totalChaptersCompleted);

    // Generate recommendation
    const recommendation = generateRecommendation(
      totalPoints,
      totalChaptersCompleted,
      totalCoursesCompleted,
      streak,
      weakCategories,
      userCourses
    );

    // Build chapter-wise marks data - sorted by completion date
    const chapterWiseMarks: ChapterMark[] = (userProgress || [])
      .filter(p => p.is_completed && p.chapter_score !== null && p.chapter_score !== undefined)
      .map(p => {
        const course = coursesMap.get(p.course_id);
        return {
          chapterIndex: p.chapter_index,
          chapterName: p.chapter_name || `Chapter ${p.chapter_index + 1}`,
          score: p.chapter_score ?? 0,
          courseName: course?.name || course?.title || 'Unknown Course',
          courseId: p.course_id,
          completedAt: p.completed_at || p.created_at,
        };
      })
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

    // Build user courses list with progress info
    const userCoursesWithProgress = userCourses.map(course => {
      const courseProgress = userProgress?.filter(p => p.course_id === course.id) || [];
      const chaptersCompleted = courseProgress.filter(p => p.is_completed).length;
      
      // Parse courseJson to get total chapters
      let totalChapters = course.noOfChapters || 0;
      try {
        const courseData = typeof course.coursejson === 'string' 
          ? JSON.parse(course.coursejson) 
          : course.coursejson;
        if (courseData?.chapters?.length) {
          totalChapters = courseData.chapters.length;
        }
      } catch (e) {
        console.log('Error parsing courseJson for course:', course.id);
      }
      
      return {
        id: course.id,
        title: course.name || course.title || 'Untitled Course',
        chaptersCompleted,
        totalChapters,
      };
    });

    const analytics: AnalyticsSummary = {
      currentStatus: {
        level,
        tier,
        totalPoints,
        rank: userRank,
        streak,
        consistency,
      },
      progressTrends,
      strengthsAndWeaknesses: {
        strongCategories,
        weakCategories,
      },
      engagementSummary,
      recommendation,
      chapterWiseMarks,
      userCourses: userCoursesWithProgress,
    };

    console.log('Analytics response:', JSON.stringify(analytics, null, 2));
    return NextResponse.json(analytics);

  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics", details: (error as Error).message },
      { status: 500 }
    );
  }
}

function calculateStreak(history: any[]): number {
  if (!history.length) return 0;

  const dates = history
    .map(h => new Date(h.earned_at).toDateString())
    .filter((date, index, self) => self.indexOf(date) === index)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  const today = new Date().toDateString();
  
  for (let i = 0; i < dates.length; i++) {
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - i);
    
    if (dates[i] === expectedDate.toDateString()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function calculateConsistency(history: any[]): number {
  if (!history.length) return 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentHistory = history.filter(h => new Date(h.earned_at) >= thirtyDaysAgo);
  const uniqueDays = new Set(recentHistory.map(h => new Date(h.earned_at).toDateString())).size;

  return Math.round((uniqueDays / 30) * 100);
}

function calculateProgressTrends(history: any[]) {
  const last7Days = getLast7DaysTrend(history);
  const last30Days = getLast30DaysTrend(history);

  return { last7Days, last30Days };
}

function getLast7DaysTrend(history: any[]) {
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayHistory = history.filter(h => 
      new Date(h.earned_at).toDateString() === date.toDateString()
    );

    const points = dayHistory.reduce((sum, h) => sum + h.points_earned, 0);
    const chapters = dayHistory.filter(h => h.chapter_index !== null).length;

    trend.push({ date: dateStr, points, chapters });
  }
  return trend;
}

function getLast30DaysTrend(history: any[]) {
  const trend = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayHistory = history.filter(h => 
      new Date(h.earned_at).toDateString() === date.toDateString()
    );

    const points = dayHistory.reduce((sum, h) => sum + h.points_earned, 0);
    const chapters = dayHistory.filter(h => h.chapter_index !== null).length;

    trend.push({ date: dateStr, points, chapters });
  }
  return trend;
}

function analyzeCategories(progress: any[], courses: any[]) {
  // Use course names for radar chart instead of categories
  // Group progress by course name
  const courseMap = new Map<number, any>();
  courses.forEach(c => courseMap.set(c.id, c));

  const courseStatsMap = new Map<string, { completed: number; total: number; started: number; courseName: string }>();

  // First, initialize all courses the user has progress in
  const uniqueCourseIds = new Set(progress.map(p => p.course_id));
  uniqueCourseIds.forEach(courseId => {
    const course = courseMap.get(courseId);
    if (course) {
      const courseName = course.name || 'Uncategorized';
      if (!courseStatsMap.has(courseName)) {
        courseStatsMap.set(courseName, { 
          completed: 0, 
          total: course.noOfChapters || course.noofchapters || 0, // Handle both camelCase and lowercase
          started: 0,
          courseName 
        });
      }
    }
  });

  // Group progress by course and calculate stats
  progress.forEach(p => {
    const course = courseMap.get(p.course_id);
    if (!course) return;

    const courseName = course.name || 'Uncategorized';
    if (!courseStatsMap.has(courseName)) {
      // Shouldn't happen, but handle it
      courseStatsMap.set(courseName, { 
        completed: 0, 
        total: course.noOfChapters || course.noofchapters || 0,
        started: 0,
        courseName 
      });
    }

    const stats = courseStatsMap.get(courseName)!;
    stats.started++;
    if (p.is_completed) {
      stats.completed++;
    }
  });

  const categories = Array.from(courseStatsMap.entries())
    .filter(([_, stats]) => stats.started > 0) // Only courses with actual progress
    .map(([courseName, stats]) => ({
      category: courseName, // Use course name for radar chart
      completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      chaptersCompleted: stats.completed,
      chaptersStarted: stats.started,
    }))
    .sort((a, b) => b.completionRate - a.completionRate); // Sort by completion rate

  const strongCategories = categories
    .filter(c => c.completionRate >= 50)
    .slice(0, 5); // Top 5 for radar chart

  const weakCategories = categories
    .filter(c => c.completionRate < 50)
    .slice(0, 3);

  return { strongCategories, weakCategories };
}

function calculateEngagement(history: any[], courses: any[], coursesCompleted: number, chaptersCompleted: number) {
  // Calculate unique active days from points history
  const uniqueDays = new Set(history.map(h => new Date(h.earned_at).toDateString())).size;
  const totalPoints = history.reduce((sum, h) => sum + h.points_earned, 0);
  const averagePointsPerDay = uniqueDays > 0 ? Math.round(totalPoints / uniqueDays) : 0;

  // Find most productive day
  const dayPoints = new Map<string, number>();
  history.forEach(h => {
    const day = new Date(h.earned_at).toLocaleDateString('en-US', { weekday: 'long' });
    dayPoints.set(day, (dayPoints.get(day) || 0) + h.points_earned);
  });

  const mostProductiveDay = Array.from(dayPoints.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Count unique courses the user has progress in
  const coursesStarted = courses.length;

  return {
    totalActiveDays: uniqueDays,
    averagePointsPerDay,
    mostProductiveDay,
    totalCoursesStarted: coursesStarted,
    totalCoursesCompleted: coursesCompleted,
    totalChaptersCompleted: chaptersCompleted,
  };
}

function generateRecommendation(
  points: number,
  chaptersCompleted: number,
  coursesCompleted: number,
  streak: number,
  weakCategories: any[],
  courses: any[]
) {
  // No activity yet
  if (points === 0) {
    return {
      action: 'Start your learning journey',
      reason: 'You haven\'t started any courses yet. Begin with a beginner-level course to earn your first points!',
      suggestedCourse: courses.find(c => c.level === 'Beginner')?.name || null,
    };
  }

  // Low streak
  if (streak === 0) {
    return {
      action: 'Build your learning streak',
      reason: 'You haven\'t been active recently. Complete a chapter today to start a new streak!',
      suggestedCourse: courses[0]?.name || null,
    };
  }

  // Has weak categories
  if (weakCategories.length > 0) {
    const weakCategory = weakCategories[0];
    const suggestedCourse = courses.find(c => c.category === weakCategory.category);
    return {
      action: `Strengthen your ${weakCategory.category} skills`,
      reason: `You've started but not completed many ${weakCategory.category} chapters. Focus on completing these to improve your mastery.`,
      suggestedCourse: suggestedCourse?.name || null,
    };
  }

  // Has incomplete courses
  if (chaptersCompleted > 0 && coursesCompleted === 0) {
    return {
      action: 'Complete your first course',
      reason: 'You\'re making progress! Finish a course to earn a 50-point completion bonus.',
      suggestedCourse: courses[0]?.name || null,
    };
  }

  // Doing well
  return {
    action: 'Explore advanced topics',
    reason: `Great job! You've completed ${coursesCompleted} course${coursesCompleted > 1 ? 's' : ''}. Challenge yourself with more advanced content.`,
    suggestedCourse: courses.find(c => c.level === 'Advanced' || c.level === 'Intermediate')?.name || null,
  };
}
