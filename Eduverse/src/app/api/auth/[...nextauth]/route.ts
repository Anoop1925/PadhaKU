// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { NextAuthOptions } from "next-auth";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: [
            "openid",
            "email",
            "profile",
            // Student scopes
            "https://www.googleapis.com/auth/classroom.courses.readonly",
            "https://www.googleapis.com/auth/classroom.announcements.readonly",
            "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
            "https://www.googleapis.com/auth/classroom.coursework.me",
            "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
            "https://www.googleapis.com/auth/classroom.rosters.readonly",
            // Teacher scopes - for full CRUD operations
            "https://www.googleapis.com/auth/classroom.courses",
            "https://www.googleapis.com/auth/classroom.coursework.students",
            "https://www.googleapis.com/auth/classroom.rosters",
            "https://www.googleapis.com/auth/classroom.announcements",
            "https://www.googleapis.com/auth/classroom.topics",
            "https://www.googleapis.com/auth/classroom.profile.emails",
          ].join(" "),
        },
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Optimize session handling
  useSecureCookies: process.env.NODE_ENV === "production",

  callbacks: {
    async signIn({ profile }) {
      // Allow all Google accounts
      return !!profile?.email;
    },
    async redirect({ url, baseUrl }) {
      // Check if URL contains parent redirect
      if (url.includes('/parent') || url.includes('parent=true')) {
        return `${baseUrl}/parent/access-key`;
      }
      // Check if URL contains teacher redirect
      if (url.includes('/teacher/dashboard')) {
        return `${baseUrl}/teacher/dashboard`;
      }
      // Default to student dashboard
      return `${baseUrl}/dashboard`;
    },
    async jwt({ token, account, user, trigger, session }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      // Handle parent session updates
      if (trigger === "update" && session) {
        if (session.parentVerified !== undefined) {
          token.parentVerified = session.parentVerified;
        }
        if (session.parentStudentEmail !== undefined) {
          token.parentStudentEmail = session.parentStudentEmail;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
        // Add parent session flags
        session.parentVerified = token.parentVerified as boolean | undefined;
        session.parentStudentEmail = token.parentStudentEmail as string | undefined;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST, authOptions };
