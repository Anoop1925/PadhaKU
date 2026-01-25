"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Trophy, Flame, Award, Activity, ArrowRight, BookOpen, 
  TrendingUp, Calendar, Zap, CheckCircle2, Library, BarChart3
} from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadialBarChart, RadialBar } from "recharts";
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
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Prepare radar chart data for knowledge signature - use actual course data from API
  // Get all courses with progress (strong + weak categories combined)
  const allCoursesWithProgress = [
    ...strengthsAndWeaknesses.strongCategories,
    ...strengthsAndWeaknesses.weakCategories
  ];

  // Remove duplicates by category name
  const uniqueCourses = Array.from(
    new Map(allCoursesWithProgress.map(c => [c.category, c])).values()
  );

  // If we have course data, use it; otherwise use default categories
  let radarData;
  if (uniqueCourses.length > 0) {
    // Use actual course names from the database (up to 5 courses for radar chart)
    const coursesForRadar = uniqueCourses.slice(0, 5);
    radarData = coursesForRadar.map(course => ({
      category: course.category.length > 20 ? course.category.substring(0, 20) + '...' : course.category,
      value: Math.max(0, Math.min(100, course.completionRate)), // Ensure value is between 0-100
      fullMark: 100,
    }));
    
    // If we have less than 5 courses, don't pad - just show what we have
    // Radar chart will adjust automatically
  } else {
    // Fallback: use default categories if no course data available
    const defaultCategories = ["Math", "Science", "Logic", "Language", "Arts"];
    radarData = defaultCategories.map(category => ({
      category,
      value: 0,
      fullMark: 100,
    }));
  }

  // Prepare radial chart data for consistency pulse - multiple concentric arcs
  // Create data for a semi-circular radial bar chart with multiple segments
  const consistencyValue = currentStatus.consistency || 75;
  // Create 7 segments representing different time periods
  const consistencyData = Array.from({ length: 7 }, (_, i) => {
    // Each segment represents a week, with decreasing values for outer rings
    const weekValue = Math.max(0, consistencyValue - (i * 10));
    return {
      name: `week-${i}`,
      value: weekValue,
      fill: "#22c55e", // Green
    };
  });

  const radarConfig = {
    value: {
      label: "Completion Rate",
      color: "#60a5fa", // Light blue
    },
  };

  const radialConfig = {
    consistency: {
      label: "Consistency",
      color: "#22c55e", // Green
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

        {/* Charts & Next Action Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Knowledge Signature - Radar Chart (Left, 2 columns) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#d0dffc] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#444fd6]" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Knowledge Signature</h2>
            </div>
            <ChartContainer
              config={radarConfig}
              className="mx-auto aspect-square h-[350px]"
            >
              <RadarChart data={radarData}>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
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

          {/* Right Column - Consistency Pulse & Next Adventure (Stacked) */}
          <div className="flex flex-col gap-8">
            {/* Consistency Pulse - Radial Chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#c8f0dc] flex items-center justify-center">
                  <Activity className="w-5 h-5 text-[#10b981]" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Consistency Pulse</h2>
              </div>
              <ChartContainer
                config={radialConfig}
                className="mx-auto aspect-square h-[200px]"
              >
                <RadialBarChart
                  data={consistencyData}
                  startAngle={180}
                  endAngle={0}
                  innerRadius={25}
                  outerRadius={85}
                >
                  <PolarGrid
                    gridType="circle"
                    radialLines={true}
                    stroke="#e5e7eb"
                    strokeWidth={0.5}
                  />
                  <RadialBar
                    dataKey="value"
                    cornerRadius={3}
                    fill="#22c55e"
                    background={{ fill: '#f3f4f6' }}
                  />
                </RadialBarChart>
              </ChartContainer>
            </div>

            {/* Next Adventure Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#c8d9f5] flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[#444fd6]" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Next Adventure</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Resume: {nextAdventureText}</p>
                  <p className="text-sm font-medium text-slate-800">{nextAdventureChapter}</p>
                </div>
                <button
                  onClick={() => router.push('/feature-2')}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  Continue Chapter
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
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

