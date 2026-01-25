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
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  console.log('Student project request:', { projectId, email });

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get student's project info
    const { data: projectData, error: projectError } = await supabase
      .from('student_projects')
      .select('*')
      .eq('project_id', projectId)
      .eq('student_email', email)
      .single();

    console.log('Student project query result:', { projectData, projectError });

    if (projectError) {
      console.error('Error fetching student project:', projectError);
      throw projectError;
    }
    if (!projectData) {
      console.log('Project not found for student:', email);
      return NextResponse.json({ error: "Project not found or you are not assigned to this project" }, { status: 404 });
    }

    // Get all milestones for the project
    const { data: allMilestones, error: milestonesError } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('sequence_order', { ascending: true });

    if (milestonesError) throw milestonesError;

    // Get group's submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('milestone_submissions')
      .select(`
        *,
        milestone_evaluations (
          marks_awarded,
          feedback,
          approved,
          evaluated_at
        )
      `)
      .eq('group_id', projectData.group_id);

    if (submissionsError) throw submissionsError;

    console.log('Total submissions for group:', submissions?.length || 0);

    // Build milestones with status using simple sequential logic
    const milestonesWithStatus = allMilestones?.map((milestone, index) => {
      const submission = submissions?.find((s) => s.milestone_id === milestone.id);
      const evaluation = submission?.milestone_evaluations?.[0];

      let status: "locked" | "active" | "submitted" | "approved" = "locked";

      // Check if this milestone has been approved
      if (evaluation && evaluation.approved) {
        status = "approved";
      } 
      // Check if this milestone has been submitted but not yet evaluated
      else if (submission) {
        status = "submitted";
      } 
      // First milestone (sequence_order = 1) is always unlocked if not submitted
      else if (milestone.sequence_order === 1) {
        status = "active";
      } 
      // Subsequent milestones: unlock if previous milestone is approved
      else if (index > 0) {
        const previousMilestone = allMilestones[index - 1];
        const prevSubmission = submissions?.find((s) => s.milestone_id === previousMilestone.id);
        const prevEvaluation = prevSubmission?.milestone_evaluations?.[0];
        
        // Unlock if previous milestone is approved
        if (prevEvaluation && prevEvaluation.approved) {
          status = "active";
        }
      }

      console.log(`Milestone ${milestone.sequence_order} (${milestone.title}): status=${status}, has_submission=${!!submission}, has_evaluation=${!!evaluation}`);

      return {
        ...milestone,
        status,
        submission: submission ? {
          id: submission.id,
          submission_type: submission.submission_type,
          submission_data: submission.submission_data,
          notes: submission.notes,
          submitted_at: submission.submitted_at
        } : undefined,
        evaluation: evaluation ? {
          marks_awarded: evaluation.marks_awarded,
          feedback: evaluation.feedback,
          evaluated_at: evaluation.evaluated_at
        } : undefined
      };
    }) || [];

    console.log('Final milestone statuses:', milestonesWithStatus.map(m => `${m.title}: ${m.status}`));

    return NextResponse.json({
      project: projectData,
      milestones: milestonesWithStatus
    });

  } catch (error) {
    console.error('Failed to fetch student project:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
