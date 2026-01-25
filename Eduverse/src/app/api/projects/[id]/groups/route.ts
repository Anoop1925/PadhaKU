import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = id;

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch groups for this project
    const { data: groups, error: groupsError } = await supabase
      .from('project_groups')
      .select('*')
      .eq('project_id', projectId);

    if (groupsError) throw groupsError;

    // For each group, fetch members and progress
    const groupsWithData = await Promise.all(
      (groups || []).map(async (group) => {
        // Fetch members
        const { data: members } = await supabase
          .from('group_members')
          .select('student_email')
          .eq('group_id', group.id);

        // Fetch progress
        const { data: progress } = await supabase
          .from('group_progress')
          .select('*')
          .eq('group_id', group.id)
          .single();

        return {
          id: group.id,
          group_name: group.group_name,
          completed_milestones: progress?.completed_milestones || 0,
          total_marks_earned: progress?.total_marks_earned || 0,
          members: members?.map((m) => m.student_email) || []
        };
      })
    );

    return NextResponse.json({
      groups: groupsWithData
    });

  } catch (error) {
    console.error('Failed to fetch groups:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
