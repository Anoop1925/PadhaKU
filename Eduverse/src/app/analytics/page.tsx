"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Trophy, Flame, Award, Activity, ArrowRight, BookOpen, 
  TrendingUp, Calendar, Zap, CheckCircle2, Library, BarChart3, ChevronDown
} from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface AnalyticsData {
  currentStatus: {
    level: number;
    tier: string;
    totalPoints: number;
    rank: number | null;
    streak: number;
    consistency: number;
  };
  progressTrends: {
    last7Days: { date: string; points: number; chapters: number }[];
    last30Days: { date: string; points: number; chapters: number }[];
  };
  strengthsAndWeaknesses: {
    strongCategories: { category: string; completionRate: number; chaptersCompleted: number }[];
    weakCategories: { category: string; completionRate: number; chaptersStarted: number }[];
  };
  engagementSummary: {
    totalActiveDays: number;
    averagePointsPerDay: number;
    mostProductiveDay: string;
    totalCoursesStarted: number;
    totalCoursesCompleted: number;
    totalChaptersCompleted: number;
  };
  recommendation: {
    action: string;
    reason: string;
    suggestedCourse: string | null;
  };
  chapterWiseMarks: {
    chapterIndex: number;
    chapterName: string;
    score: number;
    courseName: string;
    courseId: number;
    completedAt: string;
  }[];
  userCourses: {
    id: number;
    title: string;
    chaptersCompleted: number;
    totalChapters: number;
  }[];
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  useEffect(() => {
    if (session === null) {
      router.push("/sign-in");
    }
  }, [session, router]);

  useEffect(() => {
    if (!session?.user?.email) return;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const email = session.user?.email || '';
        
        const response = await fetch(`/api/analytics/summary?userEmail=${encodeURIComponent(email)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Analytics API error:', errorData);
          throw new Error(errorData.error || 'Failed to fetch analytics');
        }
        
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
        setAnalytics({
          currentStatus: {
            level: 1,
            tier: 'Beginner',
            totalPoints: 0,
            rank: null,
            streak: 0,
            consistency: 0,
          },
          progressTrends: {
            last7Days: [],
            last30Days: [],
          },
          strengthsAndWeaknesses: {
            strongCategories: [],
            weakCategories: [],
          },
          engagementSummary: {
            totalActiveDays: 0,
            averagePointsPerDay: 0,
            mostProductiveDay: 'N/A',
            totalCoursesStarted: 0,
            totalCoursesCompleted: 0,
            totalChaptersCompleted: 0,
          },
          recommendation: {
            action: 'Start your learning journey',
            reason: 'Begin with a course to start earning points and tracking your progress.',
            suggestedCourse: null,
          },
          chapterWiseMarks: [],
          userCourses: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [session]);

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafbfc]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#444fd6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  const { currentStatus, strengthsAndWeaknesses, engagementSummary, recommendation } = analytics;

  // Prepare radar chart data using userCourses from API
  // Calculate completion rate for each course
  let radarData: { category: string; fullName: string; value: number; fullMark: number; chaptersCompleted: number; totalChapters: number }[] = [];
  
  if (analytics.userCourses && analytics.userCourses.length > 0) {
    // Use all enrolled courses (up to 6 for radar chart readability)
    const coursesForRadar = analytics.userCourses.slice(0, 6);
    radarData = coursesForRadar.map(course => {
      const completionRate = course.totalChapters > 0 
        ? Math.round((course.chaptersCompleted / course.totalChapters) * 100) 
        : 0;
      const courseName = course.title || 'Untitled';
      return {
        category: courseName.length > 12 ? courseName.substring(0, 12) + '...' : courseName,
        fullName: course.title || 'Untitled Course',
        value: Math.max(0, Math.min(100, completionRate)),
        fullMark: 100,
        chaptersCompleted: course.chaptersCompleted || 0,
        totalChapters: course.totalChapters || 0,
      };
    });
  }
  
  // Radar chart needs at least 3 points - pad with empty if needed
  if (radarData.length < 3) {
    const defaultCategories = ["Course 1", "Course 2", "Course 3"];
    while (radarData.length < 3) {
      radarData.push({
        category: defaultCategories[radarData.length] || `Course ${radarData.length + 1}`,
        fullName: 'No course yet',
        value: 0,
        fullMark: 100,
        chaptersCompleted: 0,
        totalChapters: 0,
      });
    }
  }

  // Get courses for dropdown - use userCourses from API (all enrolled courses)
  const coursesForFilter = analytics.userCourses?.map(c => ({ 
    id: c.id, 
    name: c.title || 'Unnamed Course',
    chaptersCompleted: c.chaptersCompleted,
    totalChapters: c.totalChapters
  })) || [];

  // Filter and prepare chapter-wise marks data for line chart
  const filteredMarks = selectedCourse === "all" 
    ? analytics.chapterWiseMarks 
    : analytics.chapterWiseMarks.filter(m => m.courseId.toString() === selectedCourse);

  const chapterMarksData = filteredMarks.map((mark, index) => ({
    name: selectedCourse === "all" ? `Quiz ${index + 1}` : `Ch ${mark.chapterIndex + 1}`,
    score: mark.score,
    fullName: mark.chapterName,
    course: mark.courseName,
    chapterNum: mark.chapterIndex + 1,
  }));

  const radarConfig = {
    value: {
      label: "Completion Rate",
      color: "#60a5fa", // Light blue
    },
  };

  const lineChartConfig = {
    score: {
      label: "Score",
      color: "#8b5cf6", // Purple
    },
  };

  // Format recommendation for Next Adventure card - use actual data from API
  const nextAdventureText = recommendation.suggestedCourse || recommendation.action || "Start Learning";
  const nextAdventureChapter = recommendation.action 
    ? recommendation.action.includes("Chapter") 
      ? recommendation.action 
      : recommendation.reason || "Continue your learning journey"
    : recommendation.reason || "Begin with a course to start earning points";

  return (
    <div className="flex flex-col min-h-screen bg-[#fafbfc]">
      {/* Top Bar - Matching Dashboard Style */}
      <div className="px-10 py-8 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-3xl mx-8 mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/90 flex items-center justify-center backdrop-blur-sm">
              <BarChart3 className="w-8 h-8 text-[#444fd6]" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">My Growth Story</div>
              <div className="text-base text-white/80">
                Track your journey and visualize your learning patterns.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-8 py-8 overflow-y-auto">
        {/* Key Metrics Row - 4 Cards (Dashboard Style) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Current Level Card */}
          <div className="p-5 rounded-2xl bg-[#e3d4f0] border-t-[3px] border-t-[#8b5cf6] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  Lv. {currentStatus.level}
                </div>
                <div className="text-sm font-medium text-slate-600">{currentStatus.tier}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#8b5cf6] flex items-center justify-center flex-shrink-0">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Leaderboard Position Card */}
          <div className="p-5 rounded-2xl bg-[#fde6c8] border-t-[3px] border-t-[#f59e0b] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {currentStatus.rank ? `#${currentStatus.rank}` : '-'}
                </div>
                <div className="text-sm font-medium text-slate-600">Global Rank</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#f59e0b] flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Learning Ignite Card */}
          <div className="p-5 rounded-2xl bg-[#fde6c8] border-t-[3px] border-t-[#fb923c] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {currentStatus.streak || 0}
                </div>
                <div className="text-sm font-medium text-slate-600">Day Streak</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#fb923c] flex items-center justify-center flex-shrink-0">
                <Flame className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Consistency Card */}
          <div className="p-5 rounded-2xl bg-[#c8f0dc] border-t-[3px] border-t-[#10b981] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {currentStatus.consistency || 0}%
                </div>
                <div className="text-sm font-medium text-slate-600">Consistency</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#10b981] flex items-center justify-center flex-shrink-0">
                <Activity className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Knowledge Signature - Radar Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#d0dffc] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#444fd6]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Course Progress</h2>
                <p className="text-sm text-slate-500">Completion rate across your courses</p>
              </div>
            </div>
            <ChartContainer
              config={radarConfig}
              className="mx-auto aspect-square h-[350px]"
            >
              <RadarChart data={radarData}>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-200">
                          <p className="font-semibold text-slate-800 mb-1">{data.fullName}</p>
                          <p className="text-sm text-slate-500 mb-2">
                            {data.chaptersCompleted}/{data.totalChapters} chapters completed
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <p className="text-sm font-bold text-blue-600">{data.value}% Complete</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <PolarGrid 
                  gridType="circle" 
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
                <PolarAngleAxis 
                  dataKey="category" 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickLine={false}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Knowledge"
                  dataKey="value"
                  stroke="#60a5fa"
                  fill="#60a5fa"
                  fillOpacity={0.4}
                  strokeWidth={2}
                  dot={{ fill: '#60a5fa', r: 4 }}
                />
              </RadarChart>
            </ChartContainer>
          </div>

          {/* Chapter-wise Marks - Line Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#e9d5ff] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-[#8b5cf6]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">Chapter-wise Marks</h2>
                  <p className="text-sm text-slate-500">Your quiz performance across chapters</p>
                </div>
              </div>
              {/* Course Filter Dropdown */}
              {coursesForFilter.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer"
                  >
                    <option value="all">All Courses</option>
                    {coursesForFilter.map((course) => (
                      <option key={course.id} value={course.id.toString()}>
                        {course.name && course.name.length > 25 ? course.name.substring(0, 25) + '...' : course.name || 'Unnamed Course'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              )}
            </div>
            {chapterMarksData.length > 0 ? (
              <ChartContainer
                config={lineChartConfig}
                className="h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chapterMarksData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      domain={[0, 10]} 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      ticks={[0, 2, 4, 6, 8, 10]}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-200">
                              <p className="font-semibold text-slate-800 mb-1">{data.fullName}</p>
                              <p className="text-sm text-slate-500 mb-2">{data.course}</p>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                <p className="text-sm font-bold text-purple-600">Score: {data.score}/10</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5, stroke: '#fff' }}
                      activeDot={{ r: 8, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-slate-500">
                <BarChart3 className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-center font-medium">No quiz data yet</p>
                <p className="text-sm text-slate-400">Complete quizzes to see your marks!</p>
              </div>
            )}
          </div>
        </div>

        {/* Next Adventure Card - Full Width */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Continue Your Journey</h2>
                <p className="text-white/80 text-sm">{nextAdventureText}</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/feature-2')}
              className="bg-white hover:bg-slate-100 text-indigo-600 font-semibold py-3 px-6 rounded-xl transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              Continue Learning
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Statistics - Bottom Row (6 Cards) - Dashboard Style */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          {/* Total Points */}
          <div className="p-5 rounded-2xl bg-[#e3d4f0] border-t-[3px] border-t-[#8b5cf6] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {currentStatus.totalPoints}
                </div>
                <div className="text-sm font-medium text-slate-600">Total Points</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#8b5cf6] flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Active Days */}
          <div className="p-5 rounded-2xl bg-[#c8d9f5] border-t-[3px] border-t-[#444fd6] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {engagementSummary.totalActiveDays}
                </div>
                <div className="text-sm font-medium text-slate-600">Active Days</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#444fd6] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Avg Pts/Day */}
          <div className="p-5 rounded-2xl bg-[#c8f0dc] border-t-[3px] border-t-[#10b981] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {engagementSummary.averagePointsPerDay}
                </div>
                <div className="text-sm font-medium text-slate-600">Avg Pts/Day</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#10b981] flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Courses Started */}
          <div className="p-5 rounded-2xl bg-[#fde6c8] border-t-[3px] border-t-[#f59e0b] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {engagementSummary.totalCoursesStarted}
                </div>
                <div className="text-sm font-medium text-slate-600">Courses Started</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#f59e0b] flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Courses Done */}
          <div className="p-5 rounded-2xl bg-[#f5d0e0] border-t-[3px] border-t-[#ec4899] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {engagementSummary.totalCoursesCompleted}
                </div>
                <div className="text-sm font-medium text-slate-600">Courses Done</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#ec4899] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Chapters Done */}
          <div className="p-5 rounded-2xl bg-[#fde6c8] border-t-[3px] border-t-[#fb923c] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {engagementSummary.totalChaptersCompleted}
                </div>
                <div className="text-sm font-medium text-slate-600">Chapters Done</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#fb923c] flex items-center justify-center flex-shrink-0">
                <Library className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

