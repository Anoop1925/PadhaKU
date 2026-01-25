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
    
    console.log('Fetching student projects for email:', email);
    
    // First check if user exists and has student role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, role, display_name')
      .eq('email', email)
      .single();
    
    console.log('User data:', { userData, userError });
    
    // Check if student is in any groups
    const { data: groupMemberships, error: groupError } = await supabase
      .from('group_members')
      .select('group_id, student_email')
      .eq('student_email', email);
    
    console.log('Group memberships:', { groupMemberships, groupError });
    
    // Fetch from student_projects view
    const { data, error } = await supabase
      .from('student_projects')
      .select('*')
      .eq('student_email', email)
      .order('project_id', { ascending: false });
    
    console.log('Student projects query result:', { data, error, count: data?.length || 0 });
    
    if (error) throw error;
    
    return NextResponse.json({ 
      projects: data || []
    });
  } catch (error) {
    console.error('Failed to fetch student projects:', error);
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
