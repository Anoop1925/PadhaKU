"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FolderKanban, Users, Target, TrendingUp, CheckCircle2, Clock, Loader2 } from "lucide-react";

interface StudentProject {
  project_id: number;
  project_title: string;
  description: string;
  total_marks: number;
  status: string;
  group_id: number;
  group_name: string;
  completed_milestones: number;
  total_milestones: number;
  total_marks_earned: number;
}

export default function StudentProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      fetchProjects();
    }
  }, [status, session]);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`/api/projects/student?email=${session?.user?.email}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getStatusBadge = (completed: number, total: number) => {
    if (completed === total && total > 0) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        In Progress
      </span>
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#387BFF] mx-auto mb-4" />
          <p className="text-gray-500">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Projects</h1>
            <p className="text-base text-gray-500">
              Track your group projects and submit milestone deliverables
            </p>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <FolderKanban className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Projects Assigned</h3>
            <p className="text-gray-500">Your teacher hasn't assigned you to any project groups yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const progressPercentage = getProgressPercentage(
                project.completed_milestones || 0,
                project.total_milestones
              );

              return (
                <div
                  key={project.project_id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/student/projects/${project.project_id}`)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                      {project.project_title}
                      </h3>
                      {getStatusBadge(project.completed_milestones || 0, project.total_milestones)}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                    {project.description || "No description provided"}
                  </p>

                  {/* Group Info */}
                  <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      Group: {project.group_name}
                    </span>
                  </div>

                  {/* Progress Section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Milestone Progress
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {project.completed_milestones || 0} / {project.total_milestones}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#387BFF] to-[#2563eb] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Target className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">Total Marks</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{project.total_marks}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-500">Earned</span>
                      </div>
                      <p className="text-lg font-bold text-green-600">
                        {project.total_marks_earned || 0}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
