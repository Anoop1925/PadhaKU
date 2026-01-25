import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submission_id, evaluated_by, marks_awarded, feedback, approved } = body;

    // Validate required fields
    if (!submission_id || !evaluated_by || marks_awarded === undefined || approved === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: submission_id, evaluated_by, marks_awarded, approved" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the submission details to validate marks
    const { data: submissionData, error: submissionError } = await supabase
      .from("milestone_submissions")
      .select(`
        *,
        project_milestones!inner(max_marks)
      `)
      .eq("id", submission_id)
      .single();

    if (submissionError || !submissionData) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    const maxMarks = submissionData.project_milestones.max_marks;
    if (marks_awarded < 0 || marks_awarded > maxMarks) {
      return NextResponse.json(
        { error: `Marks must be between 0 and ${maxMarks}` },
        { status: 400 }
      );
    }

    // Check if evaluation already exists
    const { data: existingEval } = await supabase
      .from("milestone_evaluations")
      .select("id")
      .eq("submission_id", submission_id)
      .single();

    if (existingEval) {
      return NextResponse.json(
        { error: "This submission has already been evaluated" },
        { status: 409 }
      );
    }

    // Insert evaluation
    const { data: evaluationData, error: evaluationError } = await supabase
      .from("milestone_evaluations")
      .insert({
        submission_id,
        evaluated_by,
        marks_awarded,
        feedback: feedback || null,
        approved,
      })
      .select()
      .single();

    if (evaluationError) {
      console.error("Error creating evaluation:", evaluationError);
      return NextResponse.json(
        { error: evaluationError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Evaluation submitted successfully",
        evaluation: evaluationData
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in evaluation creation API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
