"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Lock, Clock, Upload, Link as LinkIcon, FileText, Loader2, Award } from "lucide-react";

interface Milestone {
  id: number;
  title: string;
  description: string;
  max_marks: number;
  sequence_order: number;
  status: "locked" | "active" | "submitted" | "approved";
  submission?: {
    id: number;
    submission_type: string;
    submission_data: string;
    notes: string;
    submitted_at: string;
  };
  evaluation?: {
    marks_awarded: number;
    feedback: string;
    evaluated_at: string;
  };
}

interface ProjectDetail {
  project_id: number;
  project_title: string;
  description: string;
  total_marks: number;
  group_id: number;
  group_name: string;
  completed_milestones: number;
  total_milestones: number;
  total_marks_earned: number;
}

export default function StudentProjectDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);

  // Submission form state
  const [submissionType, setSubmissionType] = useState<"file" | "link" | "text">("file");
  const [submissionData, setSubmissionData] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "authenticated" && projectId && session?.user?.email) {
      fetchProjectData();
    }
  }, [status, projectId, session]);

  const fetchProjectData = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/student?email=${session?.user?.email}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setMilestones(data.milestones || []);
        
        // Find active milestone
        const active = data.milestones?.find((m: Milestone) => m.status === "active");
        setActiveMilestone(active || null);
      }
    } catch (error) {
      console.error("Failed to fetch project data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMilestone || !project) return;

    setError("");
    if (!submissionData.trim()) {
      setError("Please provide submission data");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestone_id: activeMilestone.id,
          group_id: project.group_id,
          submitted_by: session?.user?.email,
          submission_type: submissionType,
          submission_data: submissionData,
          notes: notes || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit");
      }

      // Reset form and refresh
      setSubmissionData("");
      setNotes("");
      await fetchProjectData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const getMilestoneIcon = (milestone: Milestone) => {
    switch (milestone.status) {
      case "approved":
        return <CheckCircle2 className="w-6 h-6 text-green-600" />;
      case "submitted":
        return <Clock className="w-6 h-6 text-blue-600" />;
      case "active":
        return <div className="w-6 h-6 rounded-full border-4 border-blue-600" />;
      case "locked":
      default:
        return <Lock className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700";
      case "submitted": return "bg-blue-100 text-blue-700";
      case "active": return "bg-orange-100 text-orange-700";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#387BFF]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Project not found</p>
          <button
            onClick={() => router.push("/student/projects")}
            className="px-4 py-2 bg-[#387BFF] text-white rounded-lg"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const progressPercentage = project.total_milestones > 0
    ? Math.round((project.completed_milestones / project.total_milestones) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="px-6 py-6">
          <button
            onClick={() => router.push("/student/projects")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Projects</span>
          </button>

          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.project_title}</h1>
              <p className="text-gray-600 mb-4">{project.description || "No description"}</p>
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg inline-flex">
                <span className="text-sm font-medium">Group: {project.group_name}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="mb-2">
                <span className="text-sm text-gray-600">Total Marks</span>
                <p className="text-2xl font-bold text-gray-900">{project.total_marks}</p>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <Award className="w-5 h-5" />
                <span className="text-lg font-bold">{project.total_marks_earned || 0} earned</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-bold text-gray-900">
                {project.completed_milestones} / {project.total_milestones} Milestones
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-[#387BFF] to-[#2563eb] h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content - Two Column Layout */}
      <div className="px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Milestone Stepper */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Milestones</h2>
            <div className="space-y-4">
              {milestones.map((milestone, index) => {
                const isLast = index === milestones.length - 1;
                
                return (
                  <div key={milestone.id} className="relative">
                    {/* Connector Line */}
                    {!isLast && (
                      <div
                        className={`absolute left-[1.2rem] top-[3rem] w-0.5 h-12 ${
                          milestone.status === "approved" ? "bg-green-600" : "bg-gray-300"
                        }`}
                      />
                    )}

                    {/* Milestone Card */}
                    <div
                      className={`relative border-2 rounded-xl p-4 transition-all ${
                        milestone.status === "active"
                          ? "border-blue-600 bg-blue-50"
                          : milestone.status === "approved"
                          ? "border-green-600 bg-green-50"
                          : milestone.status === "submitted"
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-300 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getMilestoneIcon(milestone)}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(milestone.status)}`}>
                              {milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Milestone {milestone.sequence_order}</span>
                            <span className="font-semibold">Max: {milestone.max_marks} marks</span>
                          </div>

                          {/* Show evaluation if approved */}
                          {milestone.status === "approved" && milestone.evaluation && (
                            <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-green-700">✓ Approved</span>
                                <span className="text-lg font-bold text-green-600">
                                  {milestone.evaluation.marks_awarded}/{milestone.max_marks}
                                </span>
                              </div>
                              {milestone.evaluation.feedback && (
                                <p className="text-sm text-gray-700">
                                  <strong>Feedback:</strong> {milestone.evaluation.feedback}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Show submitted info */}
                          {milestone.status === "submitted" && milestone.submission && (
                            <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                              <p className="text-sm text-blue-700 font-medium">⏳ Pending Teacher Evaluation</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Submitted {new Date(milestone.submission.submitted_at).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Submission Panel */}
          <div className="lg:sticky lg:top-8 h-fit">
            {activeMilestone ? (
              <div className="bg-white border-2 border-blue-600 rounded-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Submit Work</h2>
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-1">{activeMilestone.title}</h3>
                  <p className="text-sm text-blue-700">{activeMilestone.description}</p>
                  <p className="text-xs text-blue-600 mt-2">Max Marks: {activeMilestone.max_marks}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                      {error}
                    </div>
                  )}

                  {/* Submission Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Submission Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "file", label: "File", icon: Upload },
                        { value: "link", label: "Link", icon: LinkIcon },
                        { value: "text", label: "Text", icon: FileText },
                      ].map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setSubmissionType(type.value as any)}
                          className={`p-3 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                            submissionType === type.value
                              ? "border-blue-600 bg-blue-50 text-blue-900"
                              : "border-gray-300 text-gray-600 hover:border-gray-400"
                          }`}
                        >
                          <type.icon className="w-5 h-5" />
                          <span className="text-xs font-medium">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submission Data */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {submissionType === "file" ? "File URL" : submissionType === "link" ? "Link URL" : "Text Content"}
                    </label>
                    {submissionType === "text" ? (
                      <textarea
                        value={submissionData}
                        onChange={(e) => setSubmissionData(e.target.value)}
                        placeholder="Enter your text content here..."
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#387BFF] focus:border-transparent resize-none"
                        required
                      />
                    ) : (
                      <input
                        type="url"
                        value={submissionData}
                        onChange={(e) => setSubmissionData(e.target.value)}
                        placeholder={submissionType === "file" ? "https://drive.google.com/..." : "https://..."}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#387BFF] focus:border-transparent"
                        required
                      />
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any additional notes for your teacher..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#387BFF] focus:border-transparent resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-6 py-3 bg-gradient-to-r from-[#387BFF] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Submitting..." : "Submit Work"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                {milestones.every((m) => m.status === "approved") ? (
                  <>
                    <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Project Complete!</h3>
                    <p className="text-gray-600">You've completed all milestones for this project.</p>
                  </>
                ) : (
                  <>
                    <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Milestone</h3>
                    <p className="text-gray-600">
                      {milestones.some((m) => m.status === "submitted")
                        ? "Waiting for teacher evaluation..."
                        : "Complete previous milestones to unlock the next one."}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
