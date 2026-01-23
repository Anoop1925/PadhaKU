'use client';

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Target,
  Award,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  AlertCircle
} from "lucide-react";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "semester">("month");

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track performance and engagement across all your classes
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
          {["week", "month", "semester"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? "bg-purple-600 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
              <TrendingUp className="w-4 h-4" />
              +12%
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Active Students
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">127</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
              <TrendingUp className="w-4 h-4" />
              +8%
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Avg. Completion Rate
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">87%</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
              <TrendingUp className="w-4 h-4" />
              +5%
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Avg. Score
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">82.5%</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
              <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex items-center gap-1 text-red-600 text-sm font-semibold">
              <TrendingDown className="w-4 h-4" />
              -3%
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Engagement Rate
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">76%</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trends */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Trends
            </h3>
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">Chart visualization coming soon</p>
            </div>
          </div>
        </div>

        {/* Assignment Distribution */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Assignment Distribution
            </h3>
            <PieChart className="w-5 h-5 text-purple-600" />
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-center">
              <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">Chart visualization coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Class Performance */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Class Performance Overview
        </h3>
        <div className="space-y-4">
          {[
            { name: "Mathematics 10A", students: 28, avgScore: 85, color: "purple" },
            { name: "Physics 11B", students: 25, avgScore: 78, color: "blue" },
            { name: "Chemistry 12A", students: 22, avgScore: 82, color: "green" },
            { name: "Biology 10B", students: 30, avgScore: 88, color: "orange" },
          ].map((classData, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {classData.name}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {classData.students} students • Avg: {classData.avgScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full bg-gradient-to-r from-${classData.color}-500 to-${classData.color}-600`}
                    style={{ width: `${classData.avgScore}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers & Students Needing Support */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-6 h-6 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Performers
            </h3>
          </div>
          <div className="space-y-3">
            {[
              { name: "Alice Johnson", class: "Mathematics 10A", score: 98 },
              { name: "Bob Smith", class: "Physics 11B", score: 96 },
              { name: "Carol Williams", class: "Chemistry 12A", score: 95 },
            ].map((student, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{student.class}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-yellow-600">{student.score}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Students Needing Support */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Students Needing Support
            </h3>
          </div>
          <div className="space-y-3">
            {[
              { name: "David Brown", class: "Mathematics 10A", score: 62 },
              { name: "Emma Davis", class: "Physics 11B", score: 58 },
              { name: "Frank Miller", class: "Chemistry 12A", score: 65 },
            ].map((student, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{student.class}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">{student.score}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6 text-center">
        <BarChart3 className="w-12 h-12 text-purple-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Advanced Analytics Coming Soon
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Detailed charts, predictive analytics, and custom reporting features are under development
        </p>
      </div>
    </div>
  );
}
