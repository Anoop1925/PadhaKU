import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { project_id, group_name, student_emails } = await req.json();

    if (!project_id || !group_name || !student_emails || student_emails.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Create group
    const { data: group, error: groupError } = await supabase
      .from('project_groups')
      .insert({
        project_id,
        group_name
      })
      .select()
      .single();

    if (groupError) {
      console.error('Failed to create group:', groupError);
      throw new Error(groupError.message);
    }

    // Step 2: Add members
    const membersData = student_emails.map((email: string) => ({
      group_id: group.id,
      student_email: email
    }));

    const { error: membersError } = await supabase
      .from('group_members')
      .insert(membersData);

    if (membersError) {
      console.error('Failed to add members:', membersError);
      // Rollback: Delete the group if members failed
      await supabase.from('project_groups').delete().eq('id', group.id);
      throw new Error(membersError.message);
    }

    return NextResponse.json({
      success: true,
      group: group
    });

  } catch (error) {
    console.error('Group creation error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create group' },
      { status: 500 }
    );
  }
}
