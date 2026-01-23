'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  User, 
  Users, 
  FileText, 
  TestTube, 
  GraduationCap,
  CheckCircle2,
  Clock,
  Calendar,
  BarChart3,
  AlertCircle,
  Loader2
} from "lucide-react";
import { format, formatDistanceToNow } from 'date-fns';

interface DashboardData {
  totalClasses: number;
  totalStudents: number;
  activeAssignments: number;
  upcomingTests: number;
  recentActivity: any[];
  upcomingDeadlines: any[];
  courses: any[];
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalClasses: 0,
    totalStudents: 0,
    activeAssignments: 0,
    upcomingTests: 0,
    recentActivity: [],
    upcomingDeadlines: [],
    courses: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
      return;
    }

    if (status === 'authenticated' && session?.accessToken) {
      fetchDashboardData();
    }
  }, [status, session, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/teacher/dashboard');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafbfc]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafbfc]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Failed to Load Dashboard</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fafbfc]">
      {/* Top Bar */}
      <div className="px-10 py-8 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-3xl mx-8 mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/90 flex items-center justify-center backdrop-blur-sm">
              <User className="w-8 h-8 text-[#444fd6]" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">Welcome back, {session?.user?.name || 'Teacher'}!</div>
              <div className="text-base text-white/80">
                Here&apos;s your teaching overview and class activities.
              </div>
            </div>
          </div>
          <div className="px-7 py-3.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
            <div className="text-xs font-medium text-white/80">Today</div>
            <div className="text-base font-semibold text-white">{format(new Date(), 'dd MMM yyyy')}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-8 py-8 overflow-y-auto">
        {/* KPI Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Total Classes KPI */}
          <div className="p-5 rounded-2xl bg-[#c8d9f5] border-t-[3px] border-t-[#444fd6] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">{dashboardData.totalClasses}</div>
                <div className="text-sm font-medium text-slate-600">Active Classes</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#444fd6] flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Total Students KPI */}
          <div className="p-5 rounded-2xl bg-[#c8f0dc] border-t-[3px] border-t-[#10b981] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">{dashboardData.totalStudents}</div>
                <div className="text-sm font-medium text-slate-600">Total Students</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#10b981] flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Active Assignments KPI */}
          <div className="p-5 rounded-2xl bg-[#fde6c8] border-t-[3px] border-t-[#f59e0b] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">{dashboardData.activeAssignments}</div>
                <div className="text-sm font-medium text-slate-600">Active Assignments</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#f59e0b] flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Upcoming Tests KPI */}
          <div className="p-5 rounded-2xl bg-[#fdd4cd] border-t-[3px] border-t-[#ef4444] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">{dashboardData.upcomingTests}</div>
                <div className="text-sm font-medium text-slate-600">Upcoming Tests</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#ef4444] flex items-center justify-center flex-shrink-0">
                <TestTube className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Recent Activity
            </h2>
            <div className="space-y-4">
              {dashboardData.recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No recent activity</p>
              ) : (
                dashboardData.recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      activity.type === 'submission' ? 'bg-blue-100' :
                      activity.type === 'test' ? 'bg-green-100' : 'bg-purple-100'
                    }`}>
                      {activity.type === 'submission' ? <FileText className="w-5 h-5 text-blue-600" /> :
                       activity.type === 'test' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                       <GraduationCap className="w-5 h-5 text-purple-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{activity.courseName}</p>
                      <p className="text-sm text-slate-600">{activity.courseWorkTitle}</p>
                      {activity.grade && (
                        <p className="text-xs text-green-600 font-medium mt-1">Grade: {activity.grade}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              Upcoming Deadlines
            </h2>
            <div className="space-y-4">
              {dashboardData.upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No upcoming deadlines</p>
              ) : (
                dashboardData.upcomingDeadlines.slice(0, 5).map((deadline) => {
                  const dueDate = new Date(deadline.dueDate);
                  const now = new Date();
                  const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isUrgent = daysUntil <= 2;

                  return (
                    <div key={deadline.id} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${
                      isUrgent ? 'bg-red-50 hover:bg-red-100' : 'bg-slate-50 hover:bg-slate-100'
                    }`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isUrgent ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <Clock className={`w-5 h-5 ${isUrgent ? 'text-red-600' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{deadline.title}</p>
                        <p className="text-sm text-slate-600">{deadline.courseName}</p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {format(dueDate, 'MMM dd, yyyy')}
                          {isUrgent && (
                            <span className="ml-2 text-red-600 font-semibold">
                              ({daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/teacher/classrooms')}
              className="p-5 bg-white border border-slate-200 rounded-2xl hover:shadow-lg hover:translate-y-[-2px] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-blue-500 flex items-center justify-center mb-3 transition-colors">
                <GraduationCap className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <p className="font-semibold text-slate-800">Manage Classes</p>
              <p className="text-xs text-slate-500 mt-1">View & create classrooms</p>
            </button>

            <button
              onClick={() => router.push('/teacher/classrooms')}
              className="p-5 bg-white border border-slate-200 rounded-2xl hover:shadow-lg hover:translate-y-[-2px] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-green-100 group-hover:bg-green-500 flex items-center justify-center mb-3 transition-colors">
                <FileText className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <p className="font-semibold text-slate-800">New Assignment</p>
              <p className="text-xs text-slate-500 mt-1">Create coursework</p>
            </button>

            <button
              onClick={() => router.push('/teacher/tests')}
              className="p-5 bg-white border border-slate-200 rounded-2xl hover:shadow-lg hover:translate-y-[-2px] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-100 group-hover:bg-orange-500 flex items-center justify-center mb-3 transition-colors">
                <TestTube className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors" />
              </div>
              <p className="font-semibold text-slate-800">Schedule Test</p>
              <p className="text-xs text-slate-500 mt-1">Create new assessment</p>
            </button>

            <button
              onClick={() => router.push('/teacher/analytics')}
              className="p-5 bg-white border border-slate-200 rounded-2xl hover:shadow-lg hover:translate-y-[-2px] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-100 group-hover:bg-purple-500 flex items-center justify-center mb-3 transition-colors">
                <BarChart3 className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <p className="font-semibold text-slate-800">View Analytics</p>
              <p className="text-xs text-slate-500 mt-1">Check performance</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
