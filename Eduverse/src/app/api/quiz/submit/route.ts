import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const { courseId, cid, chapterIndex, chapterName, score } = await req.json();

    if (
      (!courseId && !cid) ||
      chapterIndex === undefined ||
      !chapterName ||
      score === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve cid to courseId if needed
    let resolvedCourseId = courseId;
    if (!resolvedCourseId && cid) {
      const { data: courseData } = await supabase
        .from("courses")
        .select("id")
        .eq("cid", cid)
        .single();
      if (courseData) {
        resolvedCourseId = courseData.id;
      } else {
        return NextResponse.json(
          { error: "Course not found" },
          { status: 404 }
        );
      }
    }

    // Check if already completed
    const { data: existingProgress } = await supabase
      .from("user_progress")
      .select("is_completed")
      .eq("user_email", userEmail)
      .eq("course_id", resolvedCourseId)
      .eq("chapter_index", chapterIndex)
      .single();

    if (existingProgress?.is_completed) {
      return NextResponse.json(
        { error: "Chapter already completed", alreadyCompleted: true },
        { status: 400 }
      );
    }

    // 1. UPSERT into user_progress
    const { error: progressError } = await supabase.from("user_progress").upsert(
      {
        user_email: userEmail,
        course_id: resolvedCourseId,
        chapter_index: chapterIndex,
        chapter_name: chapterName,
        chapter_score: score,
        is_completed: true,
        completed_at: new Date().toISOString(),
      },
      {
        onConflict: "user_email,course_id,chapter_index",
      }
    );

    if (progressError) {
      console.error("Progress error:", progressError);
      return NextResponse.json(
        { error: "Failed to save progress" },
        { status: 500 }
      );
    }

    // 2. INSERT into points_history
    const { error: historyError } = await supabase.from("points_history").insert({
      user_email: userEmail,
      points_earned: score,
      course_id: resolvedCourseId,
      chapter_index: chapterIndex,
      earned_at: new Date().toISOString(),
    });

    if (historyError) {
      console.error("Points history error:", historyError);
    }

    // 3. UPDATE user_points (upsert to handle first-time users)
    // First, get current points
    const { data: currentPoints } = await supabase
      .from("user_points")
      .select("points, total_chapters_completed, total_courses_completed")
      .eq("user_email", userEmail)
      .single();

    if (currentPoints) {
      // Update existing record
      const { error: pointsError } = await supabase
        .from("user_points")
        .update({
          points: currentPoints.points + score,
          total_chapters_completed: currentPoints.total_chapters_completed + 1,
          last_updated: new Date().toISOString(),
        })
        .eq("user_email", userEmail);

      if (pointsError) {
        console.error("Points update error:", pointsError);
      }
    } else {
      // Insert new record
      const { error: pointsError } = await supabase.from("user_points").insert({
        user_email: userEmail,
        points: score,
        total_chapters_completed: 1,
        total_courses_completed: 0,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      });

      if (pointsError) {
        console.error("Points insert error:", pointsError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Quiz completed successfully!",
      score,
    });
  } catch (error) {
    console.error("Quiz submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit quiz" },
      { status: 500 }
    );
  }
}

// GET endpoint to check completion status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const cid = searchParams.get("cid");
    const chapterIndex = searchParams.get("chapterIndex");

    if (!courseId && !cid) {
      return NextResponse.json(
        { error: "Missing courseId or cid" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve cid to courseId if needed
    let resolvedCourseId = courseId;
    if (!resolvedCourseId && cid) {
      const { data: courseData } = await supabase
        .from("courses")
        .select("id")
        .eq("cid", cid)
        .single();
      if (courseData) {
        resolvedCourseId = String(courseData.id);
      } else {
        return NextResponse.json(
          { error: "Course not found" },
          { status: 404 }
        );
      }
    }

    if (chapterIndex !== null) {
      // Get specific chapter progress
      const { data } = await supabase
        .from("user_progress")
        .select("is_completed, chapter_score")
        .eq("user_email", session.user.email)
        .eq("course_id", resolvedCourseId)
        .eq("chapter_index", parseInt(chapterIndex))
        .single();

      return NextResponse.json({
        isCompleted: data?.is_completed || false,
        score: data?.chapter_score || 0,
      });
    }

    // Get all chapters progress for a course
    const { data } = await supabase
      .from("user_progress")
      .select("chapter_index, is_completed, chapter_score")
      .eq("user_email", session.user.email)
      .eq("course_id", resolvedCourseId);

    return NextResponse.json({
      progress: data || [],
    });
  } catch (error) {
    console.error("Get progress error:", error);
    return NextResponse.json(
      { error: "Failed to get progress" },
      { status: 500 }
    );
  }
}
