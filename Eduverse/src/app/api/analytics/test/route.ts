import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Simple test endpoint to verify everything works
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get("userEmail");

    if (!userEmail) {
      return NextResponse.json({ error: "Missing userEmail" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Just get user points - simplest possible query
    const { data: userPoints, error } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ 
        error: "Database error", 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    // Get leaderboard
    const { data: leaderboard } = await supabase
      .from('user_points')
      .select('user_email, points')
      .order('points', { ascending: false });

    const points = userPoints?.points || 0;
    const rank = leaderboard?.findIndex(u => u.user_email === userEmail) + 1 || null;

    return NextResponse.json({
      success: true,
      userEmail,
      hasData: !!userPoints,
      points,
      rank,
      totalUsers: leaderboard?.length || 0,
      message: userPoints ? "Data found!" : "No data for this user"
    });

  } catch (error) {
    return NextResponse.json({
      error: "Test API error",
      details: (error as Error).message
    }, { status: 500 });
  }
}
