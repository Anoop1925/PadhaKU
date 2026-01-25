import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch from teacher_project_dashboard view
    const { data, error } = await supabase
      .from('teacher_project_dashboard')
      .select('*')
      .eq('teacher_email', email)
      .order('project_id', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json({ 
      projects: data || []
    });
  } catch (error) {
    console.error('Failed to fetch teacher projects:', error);
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
