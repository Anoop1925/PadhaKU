import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { milestone_id, group_id, submitted_by, submission_type, submission_data, notes } = await req.json();

    if (!milestone_id || !group_id || !submitted_by || !submission_type || !submission_data) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if student can submit to this milestone
    const { data: canSubmit, error: checkError } = await supabase
      .rpc('can_submit_milestone', {
        p_group_id: group_id,
        p_milestone_id: milestone_id
      });

    if (checkError) {
      console.error('Permission check error:', checkError);
      throw new Error('Failed to verify submission permission');
    }

    if (!canSubmit) {
      return NextResponse.json(
        { error: "Cannot submit to this milestone. Complete previous milestones first." },
        { status: 403 }
      );
    }

    // Create submission
    const { data: submission, error: submissionError } = await supabase
      .from('milestone_submissions')
      .insert({
        milestone_id,
        group_id,
        submitted_by,
        submission_type,
        submission_data,
        notes: notes || null
      })
      .select()
      .single();

    if (submissionError) {
      // Check if it's a unique constraint violation
      if (submissionError.code === '23505') {
        return NextResponse.json(
          { error: "Submission already exists for this milestone" },
          { status: 409 }
        );
      }
      console.error('Submission error:', submissionError);
      throw new Error(submissionError.message);
    }

    return NextResponse.json({
      success: true,
      submission
    });

  } catch (error) {
    console.error('Submission creation error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create submission' },
      { status: 500 }
    );
  }
}
