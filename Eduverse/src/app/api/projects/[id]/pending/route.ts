import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = id;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch pending evaluations from the view
    const { data: pendingData, error: pendingError } = await supabase
      .from("pending_evaluations")
      .select("*")
      .eq("project_id", projectId)
      .order("submitted_at", { ascending: true });

    if (pendingError) {
      console.error("Error fetching pending evaluations:", pendingError);
      return NextResponse.json(
        { error: pendingError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ submissions: pendingData || [] });
  } catch (error) {
    console.error("Error in pending evaluations API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
