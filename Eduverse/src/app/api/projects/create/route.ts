import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface Milestone {
  title: string;
  description: string;
  max_marks: number;
  sequence_order: number;
}

export async function POST(req: NextRequest) {
  try {
    const { teacher_email, title, description, total_marks, milestones } = await req.json();

    // Validate input
    if (!teacher_email || !title || !total_marks || !milestones || milestones.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Insert project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        teacher_email,
        title,
        description: description || null,
        total_marks,
        status: 'active'
      })
      .select()
      .single();

    if (projectError) {
      console.error('Failed to create project:', projectError);
      throw new Error(projectError.message);
    }

    // Step 2: Insert milestones
    const milestonesData = milestones.map((m: Milestone) => ({
      project_id: project.id,
      title: m.title,
      description: m.description || null,
      max_marks: m.max_marks,
      sequence_order: m.sequence_order
    }));

    const { error: milestonesError } = await supabase
      .from('project_milestones')
      .insert(milestonesData);

    if (milestonesError) {
      console.error('Failed to create milestones:', milestonesError);
      // Rollback: Delete the project if milestones failed
      await supabase.from('projects').delete().eq('id', project.id);
      throw new Error(milestonesError.message);
    }

    return NextResponse.json({
      success: true,
      project: project
    });

  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create project' },
      { status: 500 }
    );
  }
}
