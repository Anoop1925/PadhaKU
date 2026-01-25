// API Route: Verify Student Email
// Validates that the student email exists in the users table

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration (matching pattern from analytics route)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated and parent is verified
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in with Google first' },
        { status: 401 }
      );
    }

    if (!session?.parentVerified) {
      return NextResponse.json(
        { error: 'Unauthorized - Parent passkey verification required' },
        { status: 403 }
      );
    }

    const { studentEmail } = await request.json();

    if (!studentEmail || typeof studentEmail !== 'string') {
      return NextResponse.json(
        { error: 'Student email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const normalizedEmail = studentEmail.toLowerCase().trim();
    let student: { email: string; display_name: string | null } | null = null;

    // Use Supabase directly (matching pattern from analytics route)
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Database configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error: supabaseError } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('email', normalizedEmail)
        .maybeSingle(); // maybeSingle() returns null if not found instead of throwing

      if (supabaseError && supabaseError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is expected, other errors are real issues
        console.error('[PARENT] Supabase query error:', supabaseError);
        throw supabaseError;
      }

      if (data) {
        student = {
          email: data.email,
          display_name: data.display_name
        };
      }
    } catch (dbError: any) {
      console.error('[PARENT] Database query failed:', dbError);
      // If it's a connection error, provide helpful message
      if (dbError.code === 'ENOTFOUND' || dbError.message?.includes('getaddrinfo')) {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check your database configuration.',
            details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
          },
          { status: 503 }
        );
      }
      throw dbError; // Re-throw other errors to be caught by outer catch
    }

    if (!student) {
      return NextResponse.json(
        { error: 'Student email not found. Please verify the email address.' },
        { status: 404 }
      );
    }

    // Student email is valid - return success
    // The session update will be handled by the frontend via NextAuth update
    return NextResponse.json({ 
      success: true,
      message: 'Student email verified successfully',
      student: {
        email: student.email,
        displayName: student.display_name
      }
    });

  } catch (error: any) {
    console.error('[PARENT] Error verifying student email:', error);
    
    // Provide more helpful error messages
    if (error.code === 'ENOTFOUND') {
      return NextResponse.json(
        { 
          error: 'Database connection failed. Please check your DATABASE_URL environment variable.',
          details: 'Unable to resolve database hostname'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

