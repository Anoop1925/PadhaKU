'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, BookOpen, TrendingUp, Award, Calendar, Clock } from 'lucide-react';

export default function ParentDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Middleware handles all authentication and verification checks
  // Show loading state only briefly
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fafbfc]">
      {/* Top Bar - Matching Dashboard Style */}
      <div className="px-10 py-8 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-3xl mx-8 mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/90 flex items-center justify-center backdrop-blur-sm">
              <Users className="w-8 h-8 text-[#444fd6]" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">Participation Dashboard</div>
              <div className="text-base text-white/80">
                Viewing participation for: <span className="font-semibold">{session.parentStudentEmail}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-8 py-8 overflow-y-auto">
        {/* Placeholder Content */}
        <div className="bg-white rounded-xl border border-slate-200 p-12">
          <div className="text-center py-12">
            <Users className="w-20 h-20 text-gray-400 mx-auto mb-6" />
            <h2 className="text-3xl font-semibold text-gray-900 mb-3">Participation Coming Soon</h2>
            <p className="text-gray-600 mb-8 text-lg">
              The participation dashboard will show detailed participation metrics and engagement data for your child.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 hover:shadow-lg transition-shadow">
                <Calendar className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2 text-lg">Attendance</h3>
                <p className="text-sm text-gray-600">Track class attendance and participation</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 hover:shadow-lg transition-shadow">
                <Clock className="w-10 h-10 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2 text-lg">Time Spent</h3>
                <p className="text-sm text-gray-600">Monitor learning time and activity</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 hover:shadow-lg transition-shadow">
                <TrendingUp className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2 text-lg">Engagement</h3>
                <p className="text-sm text-gray-600">View participation trends and patterns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

