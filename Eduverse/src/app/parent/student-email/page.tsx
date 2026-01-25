'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { update } from 'next-auth/react';
import { Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ParentStudentEmailPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [studentEmail, setStudentEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Middleware handles authentication and verification checks
    // Only check if student email is already set
    if (status === 'authenticated' && session?.parentStudentEmail) {
      router.push('/parent/dashboard');
    }
  }, [session?.parentStudentEmail, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/parent/verify-student-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentEmail: studentEmail.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid student email');
        setLoading(false);
        return;
      }

      // Update session with student email (non-blocking)
      updateSession({
        parentStudentEmail: data.student.email,
      }).catch(console.error);

      // Redirect immediately - session update happens in background
      router.push('/parent/dashboard');
    } catch (error) {
      console.error('Error verifying student email:', error);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  // Show loading state while checking session (only briefly, middleware handles auth)
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center justify-center min-h-screen py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Access Verified
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Enter your child's registered email address
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Student Email Input */}
              <div>
                <label htmlFor="studentEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Student Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="studentEmail"
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                    required
                    autoFocus
                    disabled={loading}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Enter the email address your child used to register on PadhaKU
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !studentEmail.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    Continue to Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Info */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Parent: <span className="font-medium">{session?.user?.email}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Access verified ✓
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

