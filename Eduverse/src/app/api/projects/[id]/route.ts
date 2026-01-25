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

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // Fetch milestones
    const { data: milestones, error: milestonesError } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('sequence_order', { ascending: true });

    if (milestonesError) throw milestonesError;

    return NextResponse.json({
      project,
      milestones: milestones || []
    });

  } catch (error) {
    console.error('Failed to fetch project:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
