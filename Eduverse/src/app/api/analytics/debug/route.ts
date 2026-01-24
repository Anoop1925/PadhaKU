import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get("userEmail");

    if (!userEmail) {
      return NextResponse.json({ error: "Missing userEmail" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check each table
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_email', userEmail);

    const { data: pointsHistory, error: historyError } = await supabase
      .from('points_history')
      .select('*')
      .eq('user_email', userEmail);

    const { data: userProgress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_email', userEmail);

    const { data: userCourses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .eq('userEmail', userEmail);

    // Also check all users
    const { data: allUsers } = await supabase
      .from('users')
      .select('email, display_name');

    return NextResponse.json({
      requestedEmail: userEmail,
      allUsers: allUsers?.map(u => u.email) || [],
      userPoints: {
        found: !!userPoints && userPoints.length > 0,
        data: userPoints,
        error: pointsError?.message
      },
      pointsHistory: {
        found: !!pointsHistory && pointsHistory.length > 0,
        count: pointsHistory?.length || 0,
        error: historyError?.message
      },
      userProgress: {
        found: !!userProgress && userProgress.length > 0,
        count: userProgress?.length || 0,
        error: progressError?.message
      },
      userCourses: {
        found: !!userCourses && userCourses.length > 0,
        count: userCourses?.length || 0,
        error: coursesError?.message
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: "Debug API error",
      details: (error as Error).message
    }, { status: 500 });
  }
}
