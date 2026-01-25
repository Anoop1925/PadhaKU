// Middleware: Protect Parent Routes
// Ensures parent routes are only accessible with proper authentication and verification

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Protect parent routes
    if (pathname.startsWith('/parent')) {
      // Check if user is authenticated
      if (!token) {
        return NextResponse.redirect(new URL('/sign-in?parent=true', req.url));
      }

      // Check specific parent routes
      if (pathname === '/parent/access-key') {
        // Allow access to access-key page if authenticated but not verified
        // If already verified, redirect to student email page
        if (token.parentVerified) {
          return NextResponse.redirect(new URL('/parent/student-email', req.url));
        }
        return NextResponse.next();
      }

      if (pathname === '/parent/student-email') {
        // Require parent verification
        if (!token.parentVerified) {
          return NextResponse.redirect(new URL('/parent/access-key', req.url));
        }
        // If student email already set, redirect to dashboard
        if (token.parentStudentEmail) {
          return NextResponse.redirect(new URL('/parent/dashboard', req.url));
        }
        return NextResponse.next();
      }

      if (pathname === '/parent/dashboard' || pathname.startsWith('/parent/')) {
        // Require both parent verification and student email
        if (!token.parentVerified) {
          return NextResponse.redirect(new URL('/parent/access-key', req.url));
        }
        if (!token.parentStudentEmail) {
          return NextResponse.redirect(new URL('/parent/student-email', req.url));
        }
        return NextResponse.next();
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        // For parent routes, we handle authorization in the middleware function above
        if (pathname.startsWith('/parent')) {
          return true; // Let the middleware function handle the logic
        }
        
        // For other routes, require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/parent/:path*',
    // Add other protected routes here if needed
  ],
};

