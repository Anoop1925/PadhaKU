'use client';

import { useState } from "react";
import {
  FileText,
  Download,
  Calendar,
  Users,
  TrendingUp,
  Search,
  Filter,
  BarChart3,
  User,
  GraduationCap,
  FileSpreadsheet,
  Printer
} from "lucide-react";

type ReportLevel = "student" | "teacher";
type ReportType = "performance" | "attendance" | "progress" | "comprehensive";

interface Report {
  id: string;
  title: string;
  type: ReportType;
  level: ReportLevel;
  generatedDate: string;
  period: string;
  size: string;
}

export default function ReportsPage() {
  const [activeLevel, setActiveLevel] = useState<ReportLevel>("student");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | ReportType>("all");

  const reports: Report[] = [
    {
      id: "1",
      title: "Q1 Student Performance Report - Mathematics 10A",
      type: "performance",
      level: "student",
      generatedDate: "2024-06-01",
      period: "Q1 2024",
      size: "2.4 MB"
    },
    {
      id: "2",
      title: "Mid-Year Teacher Summary Report",
      type: "comprehensive",
      level: "teacher",
      generatedDate: "2024-05-28",
      period: "Jan-May 2024",
      size: "5.1 MB"
    },
    {
      id: "3",
      title: "Student Progress Tracking - Physics 11B",
      type: "progress",
      level: "student",
      generatedDate: "2024-05-25",
      period: "May 2024",
      size: "1.8 MB"
    },
    {
      id: "4",
      title: "Class Attendance Report - All Classes",
      type: "attendance",
      level: "teacher",
      generatedDate: "2024-05-20",
      period: "May 2024",
      size: "950 KB"
    }
  ];

  const filteredReports = reports.filter(report => {
    const matchesLevel = report.level === activeLevel;
    const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || report.type === selectedType;
    return matchesLevel && matchesSearch && matchesType;
  });

  const getTypeColor = (type: ReportType) => {
    switch (type) {
      case "performance":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "attendance":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "progress":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "comprehensive":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Generate and view reports at student and teacher level
          </p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold">
          <FileText className="w-5 h-5" />
          Generate Report
        </button>
      </div>

      {/* Level Tabs */}
      <div className="flex gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2">
        <button
          onClick={() => setActiveLevel("student")}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold transition-all ${
            activeLevel === "student"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          <User className="w-5 h-5" />
          Student Level Reports
        </button>
        <button
          onClick={() => setActiveLevel("teacher")}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold transition-all ${
            activeLevel === "teacher"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          <GraduationCap className="w-5 h-5" />
          Teacher Level Reports
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Reports
            </h3>
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">24</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              This Month
            </h3>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">8</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Students Covered
            </h3>
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">127</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Downloads
            </h3>
            <Download className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">156</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as any)}
          className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
        >
          <option value="all">All Types</option>
          <option value="performance">Performance</option>
          <option value="attendance">Attendance</option>
          <option value="progress">Progress</option>
          <option value="comprehensive">Comprehensive</option>
        </select>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No reports found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery
                ? "Try adjusting your search"
                : `No ${activeLevel} level reports available yet`}
            </p>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg font-semibold">
              <FileText className="w-5 h-5" />
              Generate Report
            </button>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <FileSpreadsheet className="w-6 h-6 text-purple-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {report.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(report.type)}`}>
                          {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {report.period}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mt-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Generated on {new Date(report.generatedDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {report.size}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="p-3 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors">
                    <Download className="w-5 h-5" />
                  </button>
                  <button className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    <Printer className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Report Templates */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Available Report Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "Performance Report", icon: BarChart3, color: "purple" },
            { name: "Attendance Report", icon: Calendar, color: "blue" },
            { name: "Progress Tracking", icon: TrendingUp, color: "green" },
            { name: "Comprehensive Summary", icon: FileText, color: "orange" },
          ].map((template, index) => (
            <div
              key={index}
              className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors cursor-pointer text-center"
            >
              <template.icon className={`w-8 h-8 text-${template.color}-600 mx-auto mb-2`} />
              <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6 text-center">
        <FileText className="w-12 h-12 text-purple-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Advanced Reporting Features Coming Soon
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Custom report builder, automated scheduling, and export to multiple formats
        </p>
      </div>
    </div>
  );
}
