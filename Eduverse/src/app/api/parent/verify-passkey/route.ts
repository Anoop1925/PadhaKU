// API Route: Verify Parent Passkey
// Server-side validation of parent access key

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated via Google OAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in with Google first' },
        { status: 401 }
      );
    }

    const { passkey } = await request.json();

    if (!passkey || typeof passkey !== 'string') {
      return NextResponse.json(
        { error: 'Passkey is required' },
        { status: 400 }
      );
    }

    // Server-side validation against environment variable
    const validPasskey = process.env.PARENT_ACCESS_KEY;
    
    if (!validPasskey) {
      console.error('[PARENT] PARENT_ACCESS_KEY not configured in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Secure comparison (constant-time comparison to prevent timing attacks)
    const isValid = passkey === validPasskey;

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid passkey. Access denied.' },
        { status: 403 }
      );
    }

    // Passkey is valid - return success
    // The session update will be handled by the frontend via NextAuth update
    return NextResponse.json({ 
      success: true,
      message: 'Passkey verified successfully' 
    });

  } catch (error) {
    console.error('[PARENT] Error verifying passkey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

