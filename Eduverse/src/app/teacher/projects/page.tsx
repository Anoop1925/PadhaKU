"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PlusCircle, FolderKanban, Users, Target, Calendar, MoreVertical, Loader2 } from "lucide-react";
import CreateProjectModal from "./CreateProjectModal";

interface TeacherProject {
  project_id: number;
  title: string;
  description: string;
  total_marks: number;
  status: string;
  created_at: string;
  total_groups: number;
  total_students: number;
  total_milestones: number;
}

export default function TeacherProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<TeacherProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      fetchProjects();
    }
  }, [status, session]);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`/api/projects/teacher?email=${session?.user?.email}`);
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

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      draft: "bg-gray-100 text-gray-700",
      archived: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Projects</h1>
              <p className="text-base text-gray-500">
                Create and manage milestone-based group projects for your students
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#387BFF] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white rounded-lg font-semibold text-sm shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <FolderKanban className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Projects Yet</h3>
            <p className="text-gray-500 mb-6">Create your first project to get started with milestone-based learning</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-[#387BFF] hover:bg-[#2563eb] text-white rounded-lg font-semibold text-sm transition-colors"
            >
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.project_id}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/teacher/projects/${project.project_id}`)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                      {project.title}
                    </h3>
                    {getStatusBadge(project.status)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Will implement dropdown menu
                    }}
                    className="p-1 hover:bg-gray-100 rounded-md"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                  {project.description || "No description provided"}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-gray-200">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-lg font-bold text-gray-900">{project.total_groups || 0}</span>
                    </div>
                    <p className="text-xs text-gray-500">Groups</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-lg font-bold text-gray-900">{project.total_students || 0}</span>
                    </div>
                    <p className="text-xs text-gray-500">Students</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Target className="w-4 h-4 text-gray-400" />
                      <span className="text-lg font-bold text-gray-900">{project.total_milestones || 0}</span>
                    </div>
                    <p className="text-xs text-gray-500">Milestones</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className="font-medium text-[#387BFF]">{project.total_marks} marks</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchProjects}
        teacherEmail={session?.user?.email || ""}
      />
    </div>
  );
}
