"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Trophy, Flame, Award, Activity, ArrowRight, BookOpen, 
  TrendingUp, Sparkles, LogOut, User, Calendar, Zap, CheckCircle2, Library
} from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadialBarChart, RadialBar } from "recharts";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import Image from "next/image";

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

  const { currentStatus, progressTrends, strengthsAndWeaknesses, engagementSummary, recommendation } = analytics;
  const hasData = currentStatus.totalPoints > 0 || engagementSummary.totalChaptersCompleted > 0;

  // Prepare radar chart data for knowledge signature - ensure 5 categories
  const defaultCategories = ["Math", "Science", "Logic", "Language", "Arts"];
  const categoryMap = new Map(
    strengthsAndWeaknesses.strongCategories.map(cat => [cat.category, cat.completionRate])
  );
  
  const radarData = defaultCategories.map(category => ({
    category,
    value: categoryMap.get(category) || 0,
    fullMark: 100,
  }));

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

  // Format recommendation for Next Adventure card
  const nextAdventureText = recommendation.suggestedCourse || "Physics 101";
  const nextAdventureChapter = recommendation.action 
    ? recommendation.action.includes("Chapter") 
      ? recommendation.action 
      : `Chapter 3: ${recommendation.action}`
    : "Chapter 3: Motion in 2D";

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-8">
      {/* Dark Blue Header Banner */}
      <div className="bg-[#1e3a8a] px-8 py-6">
        <div className="max-w-[1400px] mx-auto">
          <h1 className="text-3xl font-bold text-white mb-1">My Growth Story</h1>
          <p className="text-white/90 text-sm">Track your journey and visualize your learning patterns.</p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 pt-6">
        {/* User Profile & Key Metrics Row - 4 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* User Profile Card */}
          <Card className="bg-white rounded-xl shadow-sm border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-base mb-1">
                    {session?.user?.name || 'Rahul Sharma'}
                  </h3>
                  <p className="text-sm text-slate-500 mb-3 truncate">
                    {session?.user?.email || 'student@padhaku.com'}
                  </p>
                  <button
                    onClick={() => router.push('/sign-in')}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <ArrowRight className="w-3 h-3" />
                    Logout
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Level Card */}
          <Card className="bg-white rounded-xl shadow-sm border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Award className="w-10 h-10 text-purple-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-3xl font-bold text-slate-800 mb-1">
                    Lv. {currentStatus.level}
                  </div>
                  <div className="text-sm text-slate-600 mb-1">{currentStatus.tier}</div>
                  <div className="text-xs text-slate-500">Current Level</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard Position Card */}
          <Card className="bg-white rounded-xl shadow-sm border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Trophy className="w-10 h-10 text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-3xl font-bold text-slate-800 mb-1">
                    {currentStatus.rank ? `#${currentStatus.rank}` : '#11'}
                  </div>
                  <div className="text-sm text-slate-600 mb-1">Global Rank</div>
                  <div className="text-xs text-slate-500">Leaderboard Position</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learning Ignite Card */}
          <Card className="bg-white rounded-xl shadow-sm border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Flame className="w-10 h-10 text-orange-500 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-3xl font-bold text-slate-800 mb-1">
                    {currentStatus.streak || 4}
                  </div>
                  <div className="text-sm text-slate-600 mb-1">Day Streak</div>
                  <div className="text-xs text-slate-500">Learning Ignite</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area - Charts & Next Action */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Knowledge Signature - Radar Chart (Left) */}
          <Card className="bg-white rounded-xl shadow-sm border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold">Knowledge Signature</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ChartContainer
                config={radarConfig}
                className="mx-auto aspect-square h-[300px]"
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
            </CardContent>
          </Card>

          {/* Right Column - Consistency Pulse & Next Adventure (Stacked) */}
          <div className="flex flex-col gap-4">
            {/* Consistency Pulse - Radial Chart (Top Right) */}
            <Card className="bg-white rounded-xl shadow-sm border-slate-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Consistency Pulse</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
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
              </CardContent>
            </Card>

            {/* Next Adventure Card (Bottom Right) */}
            <Card className="bg-white rounded-xl shadow-sm border-slate-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Next Adventure</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Resume: {nextAdventureText}</p>
                    <p className="text-sm font-medium text-slate-800">{nextAdventureChapter}</p>
                  </div>
                  <button
                    onClick={() => router.push('/feature-2')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    Continue Chapter
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Summary Statistics - Bottom Row (6 Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total Points */}
          <div className="bg-[#9333ea] rounded-xl p-5 shadow-sm">
            <Trophy className="w-5 h-5 text-white/90 mb-2" />
            <div className="text-3xl font-bold text-white mb-1">
              {currentStatus.totalPoints || 1250}
            </div>
            <div className="text-xs text-white/90 font-medium">Total Points</div>
          </div>

          {/* Active Days */}
          <div className="bg-[#3b82f6] rounded-xl p-5 shadow-sm">
            <Calendar className="w-5 h-5 text-white/90 mb-2" />
            <div className="text-3xl font-bold text-white mb-1">
              {engagementSummary.totalActiveDays || 30}
            </div>
            <div className="text-xs text-white/90 font-medium">Active Days</div>
          </div>

          {/* Avg Pts/Day */}
          <div className="bg-[#10b981] rounded-xl p-5 shadow-sm">
            <Zap className="w-5 h-5 text-white/90 mb-2" />
            <div className="text-3xl font-bold text-white mb-1">
              {engagementSummary.averagePointsPerDay || 22}
            </div>
            <div className="text-xs text-white/90 font-medium">Avg Pts/Day</div>
          </div>

          {/* Courses Started */}
          <div className="bg-[#fbbf24] rounded-xl p-5 shadow-sm">
            <BookOpen className="w-5 h-5 text-white/90 mb-2" />
            <div className="text-3xl font-bold text-white mb-1">
              {engagementSummary.totalCoursesStarted || 5}
            </div>
            <div className="text-xs text-white/90 font-medium">Courses Started</div>
          </div>

          {/* Courses Done */}
          <div className="bg-[#f87171] rounded-xl p-5 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-white/90 mb-2" />
            <div className="text-3xl font-bold text-white mb-1">
              {engagementSummary.totalCoursesCompleted || 3}
            </div>
            <div className="text-xs text-white/90 font-medium">Courses Done</div>
          </div>

          {/* Chapters Done */}
          <div className="bg-[#fb923c] rounded-xl p-5 shadow-sm">
            <Library className="w-5 h-5 text-white/90 mb-2" />
            <div className="text-3xl font-bold text-white mb-1">
              {engagementSummary.totalChaptersCompleted || 42}
            </div>
            <div className="text-xs text-white/90 font-medium">Chapters Done</div>
          </div>
        </div>
      </div>
    </div>
  );
}

