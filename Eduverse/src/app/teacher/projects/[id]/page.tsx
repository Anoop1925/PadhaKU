"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Users, Target, CheckCircle2, Clock, Plus, Loader2, Edit, Settings, FileText, ExternalLink, AlertCircle } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";

interface Project {
  id: number;
  title: string;
  description: string;
  total_marks: number;
  status: string;
  created_at: string;
}

interface Milestone {
  id: number;
  title: string;
  description: string;
  max_marks: number;
  sequence_order: number;
}

interface Group {
  id: number;
  group_name: string;
  completed_milestones: number;
  total_marks_earned: number;
  members: string[];
}

interface PendingSubmission {
  submission_id: number;
  milestone_id: number;
  milestone_title: string;
  milestone_max_marks: number;
  group_id: number;
  group_name: string;
  submission_type: string;
  submission_data: string;
  notes: string;
  submitted_by: string;
  submitted_at: string;
}

type Tab = "overview" | "groups" | "milestones" | "pending";

export default function TeacherProjectDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [evaluatingSubmission, setEvaluatingSubmission] = useState<PendingSubmission | null>(null);
  const [evaluationMarks, setEvaluationMarks] = useState("");
  const [evaluationFeedback, setEvaluationFeedback] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<Group | null>(null);
  const [groupMemberDetails, setGroupMemberDetails] = useState<Array<{email: string, display_name: string}>>([]);

  useEffect(() => {
    if (status === "authenticated" && projectId) {
      fetchProjectData();
    }
  }, [status, projectId]);

  const fetchProjectData = async () => {
    try {
      // Fetch project details
      const projectRes = await fetch(`/api/projects/${projectId}`);
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData.project);
        setMilestones(projectData.milestones || []);
      }

      // Fetch groups
      const groupsRes = await fetch(`/api/projects/${projectId}/groups`);
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData.groups || []);
      }

      // Fetch pending submissions
      const pendingRes = await fetch(`/api/projects/${projectId}/pending`);
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingSubmissions(pendingData.submissions || []);
      }
    } catch (error) {
      console.error("Failed to fetch project data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewGroupMembers = async (group: Group) => {
    setViewingGroup(group);
    // Fetch full user details for group members using Supabase REST API
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      const emailList = group.members.map(email => `"${email}"`).join(',');
      const response = await fetch(
        `${supabaseUrl}/rest/v1/users?email=in.(${emailList})&select=email,display_name`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      );
      
      if (response.ok) {
        const users = await response.json();
        setGroupMemberDetails(users);
      } else {
        // Fallback: use emails as display names
        setGroupMemberDetails(group.members.map(email => ({ 
          email, 
          display_name: email.split('@')[0]
        })));
      }
    } catch (error) {
      console.error('Error fetching member details:', error);
      // Fallback: use emails as display names
      setGroupMemberDetails(group.members.map(email => ({ 
        email, 
        display_name: email.split('@')[0]
      })));
    }
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      fetchProjectData();
    }
  }, [status, projectId, session]);

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
            onClick={() => router.push("/teacher/projects")}
            className="px-4 py-2 bg-[#387BFF] text-white rounded-lg"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const totalStudents = groups.reduce((sum, g) => sum + g.members.length, 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <button
            onClick={() => router.push("/teacher/projects")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Projects</span>
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.title}</h1>
              <p className="text-gray-600 mb-4">{project.description || "No description"}</p>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    <span className="font-bold text-gray-900">{groups.length}</span> Groups
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    <span className="font-bold text-gray-900">{totalStudents}</span> Students
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    <span className="font-bold text-gray-900">{milestones.length}</span> Milestones
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Total: <span className="font-bold text-[#387BFF]">{project.total_marks}</span> marks
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center gap-6 border-b border-gray-200">
            {[
              { id: "overview", label: "Overview" },
              { id: "groups", label: "Groups" },
              { id: "milestones", label: "Milestones" },
              { id: "pending", label: `Pending (${pendingSubmissions.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === tab.id
                    ? "text-[#387BFF]"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#387BFF]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Total Groups</span>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-900">{groups.length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-900">Students</span>
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-900">{totalStudents}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-900">Milestones</span>
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-purple-900">{milestones.length}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>
              <dl className="space-y-3">
                <div className="flex items-start justify-between">
                  <dt className="text-sm font-medium text-gray-600">Status</dt>
                  <dd className="text-sm text-gray-900 font-semibold capitalize">{project.status}</dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="text-sm font-medium text-gray-600">Created</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(project.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="text-sm font-medium text-gray-600">Total Marks</dt>
                  <dd className="text-sm font-bold text-[#387BFF]">{project.total_marks}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === "groups" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Project Groups</h2>
              <button
                onClick={() => setShowGroupModal(true)}
                className="px-4 py-2 bg-[#387BFF] hover:bg-[#2563eb] text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Group
              </button>
            </div>

            {groups.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Groups Yet</h3>
                <p className="text-gray-500 mb-6">Create groups and assign students to start the project</p>
                <button
                  onClick={() => setShowGroupModal(true)}
                  className="px-6 py-3 bg-[#387BFF] hover:bg-[#2563eb] text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  Create First Group
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groups.map((group) => {
                  const progress = milestones.length > 0
                    ? Math.round((group.completed_milestones / milestones.length) * 100)
                    : 0;

                  return (
                    <div
                      key={group.id}
                      onClick={() => handleViewGroupMembers(group)}
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{group.group_name}</h3>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Progress</span>
                          <span className="text-sm font-bold text-gray-900">
                            {group.completed_milestones} / {milestones.length}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-[#387BFF] to-[#2563eb] h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500">Members</p>
                          <p className="text-sm font-bold text-gray-900">{group.members.length} students</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Marks Earned</p>
                          <p className="text-sm font-bold text-green-600">{group.total_marks_earned || 0}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Milestones Tab */}
        {activeTab === "milestones" && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Project Milestones</h2>
            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className="bg-white border border-gray-200 rounded-xl p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-[#387BFF] text-white rounded-full flex items-center justify-center font-bold">
                      {milestone.sequence_order}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{milestone.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{milestone.description || "No description"}</p>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          Max Marks: <span className="font-bold text-[#387BFF]">{milestone.max_marks}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Evaluations Tab */}
        {activeTab === "pending" && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Pending Evaluations</h2>
            
            {pendingSubmissions.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <CheckCircle2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
                <p className="text-gray-500">No submissions awaiting evaluation</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSubmissions.map((submission) => (
                  <div
                    key={submission.submission_id}
                    className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {submission.milestone_title}
                          </h3>
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                            Pending Review
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Group:</strong> {submission.group_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Submitted {new Date(submission.submitted_at).toLocaleString()} by {submission.submitted_by}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setEvaluatingSubmission(submission);
                          setEvaluationMarks("");
                          setEvaluationFeedback("");
                        }}
                        className="px-4 py-2 bg-[#387BFF] hover:bg-[#2563eb] text-white rounded-lg font-medium text-sm transition-colors"
                      >
                        Evaluate
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-700">Submission Type:</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          {submission.submission_type.toUpperCase()}
                        </span>
                      </div>
                      
                      {submission.submission_type === "text" ? (
                        <div className="mt-3">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.submission_data}</p>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <a
                            href={submission.submission_data}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {submission.submission_data}
                          </a>
                        </div>
                      )}

                      {submission.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Student Notes:</p>
                          <p className="text-sm text-gray-700">{submission.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Max Marks: <span className="font-bold text-[#387BFF]">{submission.milestone_max_marks}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Group Members Modal */}
      {viewingGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{viewingGroup.group_name}</h2>
                <p className="text-sm text-gray-500 mt-1">{viewingGroup.members.length} members</p>
              </div>
              <button
                onClick={() => {
                  setViewingGroup(null);
                  setGroupMemberDetails([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <AlertCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Group Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Progress</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {viewingGroup.completed_milestones} / {milestones.length}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Marks Earned</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {viewingGroup.total_marks_earned || 0}
                  </p>
                </div>
              </div>

              {/* Members List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Members</h3>
                <div className="space-y-3">
                  {groupMemberDetails.length > 0 ? (
                    groupMemberDetails.map((member, index) => (
                      <div
                        key={member.email}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#387BFF] to-[#2563eb] flex items-center justify-center text-white font-bold">
                            {member.display_name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {member.display_name || 'Student'}
                            </p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          Member #{index + 1}
                        </span>
                      </div>
                    ))
                  ) : (
                    viewingGroup.members.map((email, index) => (
                      <div
                        key={email}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#387BFF] to-[#2563eb] flex items-center justify-center text-white font-bold">
                            {email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">{email}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          Member #{index + 1}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      {evaluatingSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Evaluate Submission</h2>
              <button
                onClick={() => setEvaluatingSubmission(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={evaluating}
              >
                <AlertCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Submission Info */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">{evaluatingSubmission.milestone_title}</h3>
                <p className="text-sm text-blue-700">
                  <strong>Group:</strong> {evaluatingSubmission.group_name}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Submitted by:</strong> {evaluatingSubmission.submitted_by}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Max Marks:</strong> {evaluatingSubmission.milestone_max_marks}
                </p>
              </div>

              {/* Submission Content */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Submitted Work:</h4>
                {evaluatingSubmission.submission_type === "text" ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{evaluatingSubmission.submission_data}</p>
                ) : (
                  <a
                    href={evaluatingSubmission.submission_data}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Submission
                  </a>
                )}
                {evaluatingSubmission.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Notes:</p>
                    <p className="text-sm text-gray-700">{evaluatingSubmission.notes}</p>
                  </div>
                )}
              </div>

              {/* Evaluation Form */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!evaluatingSubmission) return;

                const marks = Number(evaluationMarks);
                if (marks < 0 || marks > evaluatingSubmission.milestone_max_marks) {
                  alert(`Marks must be between 0 and ${evaluatingSubmission.milestone_max_marks}`);
                  return;
                }

                setEvaluating(true);
                try {
                  const res = await fetch("/api/evaluations/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      submission_id: evaluatingSubmission.submission_id,
                      evaluated_by: session?.user?.email,
                      marks_awarded: marks,
                      feedback: evaluationFeedback || null,
                      approved: true,
                    }),
                  });

                  if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to submit evaluation");
                  }

                  setEvaluatingSubmission(null);
                  await fetchProjectData();
                } catch (err) {
                  alert((err as Error).message);
                } finally {
                  setEvaluating(false);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Marks Awarded <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={evaluationMarks}
                    onChange={(e) => setEvaluationMarks(e.target.value)}
                    min="0"
                    max={evaluatingSubmission.milestone_max_marks}
                    step="0.5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#387BFF] focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: {evaluatingSubmission.milestone_max_marks} marks
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Feedback
                  </label>
                  <textarea
                    value={evaluationFeedback}
                    onChange={(e) => setEvaluationFeedback(e.target.value)}
                    placeholder="Provide feedback to the student group..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#387BFF] focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setEvaluatingSubmission(null)}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    disabled={evaluating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={evaluating}
                  >
                    {evaluating ? "Submitting..." : "Approve & Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onSuccess={fetchProjectData}
        projectId={Number(projectId)}
      />
    </div>
  );
}
