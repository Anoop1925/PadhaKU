import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all students with their points
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('email, display_name')
      .eq('role', 'student')
      .order('display_name', { ascending: true });

    if (usersError) throw usersError;

    // If projectId provided, exclude students already in groups for this project
    let excludedEmails: string[] = [];
    if (projectId) {
      const { data: existingGroups } = await supabase
        .from('project_groups')
        .select('id')
        .eq('project_id', projectId);

      if (existingGroups && existingGroups.length > 0) {
        const groupIds = existingGroups.map(g => g.id);
        const { data: existingMembers } = await supabase
          .from('group_members')
          .select('student_email')
          .in('group_id', groupIds);

        if (existingMembers) {
          excludedEmails = existingMembers.map(m => m.student_email);
        }
      }
    }

    // Filter out excluded students
    const availableUsers = users?.filter(user => !excludedEmails.includes(user.email)) || [];

    // Fetch points for each user
    const studentsWithPoints = await Promise.all(
      availableUsers.map(async (user) => {
        const { data: pointsData } = await supabase
          .from('user_points')
          .select('points')
          .eq('user_email', user.email)
          .single();

        return {
          email: user.email,
          display_name: user.display_name || user.email,
          user_points: pointsData?.points || 0
        };
      })
    );

    return NextResponse.json({
      students: studentsWithPoints
    });

  } catch (error) {
    console.error('Failed to fetch students:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
