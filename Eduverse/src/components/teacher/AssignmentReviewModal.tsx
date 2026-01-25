'use client';

import { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, Clock, XCircle, Eye, Award, Send, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface StudentSubmission {
  id: string;
  userId: string;
  courseWorkId: string;
  state: 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT';
  assignedGrade?: number;
  draftGrade?: number;
  alternateLink: string;
  courseWorkType: string;
  creationTime: string;
  updateTime: string;
  late?: boolean;
  submissionHistory?: any[];
  assignmentSubmission?: {
    attachments?: any[];
  };
  shortAnswerSubmission?: {
    answer: string;
  };
}

interface UserProfile {
  id: string;
  name: { fullName: string };
  emailAddress: string;
  photoUrl?: string;
}

interface AssignmentReviewModalProps {
  classroomId: string;
  assignment: {
    id: string;
    title: string;
    maxPoints?: number;
    description?: string;
  };
  onClose: () => void;
}

export default function AssignmentReviewModal({ classroomId, assignment, onClose }: AssignmentReviewModalProps) {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState('');

  // Fetch submissions
  useEffect(() => {
    fetchSubmissions();
  }, [classroomId, assignment.id]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/teacher/classrooms/${classroomId}/coursework/${assignment.id}/submissions`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const data = await response.json();
      setSubmissions(data.submissions || []);

      // Fetch student profiles
      await fetchStudentProfiles(data.submissions || []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProfiles = async (subs: StudentSubmission[]) => {
    try {
      // Fetch real student profiles from Google Classroom
      const response = await fetch(`/api/teacher/classrooms/${classroomId}/students`);
      
      if (!response.ok) {
        console.error('Failed to fetch student profiles');
        // Fallback to userId if API fails
        const profiles = new Map<string, UserProfile>();
        subs.forEach(sub => {
          profiles.set(sub.userId, {
            id: sub.userId,
            name: { fullName: `Student ${sub.userId.substring(0, 8)}` },
            emailAddress: 'student@example.com',
          });
        });
        setStudentProfiles(profiles);
        return;
      }

      const data = await response.json();
      const profiles = new Map<string, UserProfile>();
      
      // Map students by userId
      data.students?.forEach((student: any) => {
        profiles.set(student.userId, {
          id: student.userId,
          name: student.profile.name,
          emailAddress: student.profile.emailAddress,
          photoUrl: student.profile.photoUrl,
        });
      });

      setStudentProfiles(profiles);
    } catch (err) {
      console.error('Error fetching student profiles:', err);
      // Fallback to basic info
      const profiles = new Map<string, UserProfile>();
      subs.forEach(sub => {
        profiles.set(sub.userId, {
          id: sub.userId,
          name: { fullName: `Student ${sub.userId.substring(0, 8)}` },
          emailAddress: 'student@example.com',
        });
      });
      setStudentProfiles(profiles);
    }
  };

  const getSubmissionStatus = (submission: StudentSubmission) => {
    switch (submission.state) {
      case 'TURNED_IN':
        return { label: 'Turned In', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 };
      case 'RETURNED':
        return { label: 'Returned', color: 'bg-green-100 text-green-700 border-green-200', icon: Award };
      case 'CREATED':
      case 'NEW':
        return { label: 'Not Submitted', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: XCircle };
      case 'RECLAIMED_BY_STUDENT':
        return { label: 'Reclaimed', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock };
      default:
        return { label: submission.state, color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock };
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission) return;

    const grade = parseFloat(gradeInput);
    if (isNaN(grade)) {
      setError('Please enter a valid grade');
      return;
    }

    if (assignment.maxPoints && grade > assignment.maxPoints) {
      setError(`Grade cannot exceed ${assignment.maxPoints} points`);
      return;
    }

    try {
      setGrading(true);
      setError(null);

      const requestBody: any = {
        assignedGrade: grade,
        draftGrade: grade,
      };

      // Note: Private comments are not supported by Google Classroom API
      // Teachers must add comments through Google Classroom UI

      const response = await fetch(
        `/api/teacher/classrooms/${classroomId}/coursework/${assignment.id}/submissions/${selectedSubmission.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save grade');
      }

      // Update local state
      setSubmissions(prev =>
        prev.map(sub =>
          sub.id === selectedSubmission.id
            ? { ...sub, assignedGrade: grade, draftGrade: grade }
            : sub
        )
      );

      setSelectedSubmission(prev => prev ? { ...prev, assignedGrade: grade, draftGrade: grade } : null);
      alert('Grade saved successfully!');
    } catch (err) {
      console.error('Error grading:', err);
      setError(err instanceof Error ? err.message : 'Failed to save grade');
    } finally {
      setGrading(false);
    }
  };

  const handleReturnSubmission = async () => {
    if (!selectedSubmission) return;

    if (!selectedSubmission.assignedGrade && selectedSubmission.assignedGrade !== 0) {
      setError('Please assign a grade before returning');
      return;
    }

    try {
      setGrading(true);
      setError(null);

      const response = await fetch(
        `/api/teacher/classrooms/${classroomId}/coursework/${assignment.id}/submissions/${selectedSubmission.id}/return`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to return submission');
      }

      // Update local state
      setSubmissions(prev =>
        prev.map(sub =>
          sub.id === selectedSubmission.id ? { ...sub, state: 'RETURNED' } : sub
        )
      );

      setSelectedSubmission(prev => prev ? { ...prev, state: 'RETURNED' } : null);
      alert('Submission returned to student!');
    } catch (err) {
      console.error('Error returning:', err);
      setError(err instanceof Error ? err.message : 'Failed to return submission');
    } finally {
      setGrading(false);
    }
  };

  const submittedCount = submissions.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED').length;
  const gradedCount = submissions.filter(s => s.state === 'RETURNED').length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-6xl w-full my-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            {selectedSubmission && (
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {selectedSubmission ? 'Review Submission' : assignment.title}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {selectedSubmission
                  ? studentProfiles.get(selectedSubmission.userId)?.name.fullName || 'Student'
                  : `${submittedCount}/${submissions.length} submitted • ${gradedCount} graded`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : selectedSubmission ? (
            <SubmissionDetailView
              submission={selectedSubmission}
              studentName={studentProfiles.get(selectedSubmission.userId)?.name.fullName || 'Student'}
              maxPoints={assignment.maxPoints}
              gradeInput={gradeInput}
              setGradeInput={setGradeInput}
              onGrade={handleGradeSubmission}
              onReturn={handleReturnSubmission}
              grading={grading}
            />
          ) : (
            <SubmissionsListView
              submissions={submissions}
              studentProfiles={studentProfiles}
              onSelectSubmission={setSelectedSubmission}
              getSubmissionStatus={getSubmissionStatus}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Submissions List View
function SubmissionsListView({
  submissions,
  studentProfiles,
  onSelectSubmission,
  getSubmissionStatus,
}: any) {
  return (
    <div className="space-y-2">
      {submissions.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No submissions yet</p>
        </div>
      ) : (
        submissions.map((submission: StudentSubmission) => {
          const status = getSubmissionStatus(submission);
          const StatusIcon = status.icon;
          const student = studentProfiles.get(submission.userId);

          return (
            <button
              key={submission.id}
              onClick={() => onSelectSubmission(submission)}
              className="w-full p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {student?.name.fullName.charAt(0) || 'S'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">
                      {student?.name.fullName || 'Student'}
                    </p>
                    <p className="text-sm text-slate-500">{student?.emailAddress}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {submission.assignedGrade !== undefined && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {submission.assignedGrade}
                      </p>
                      <p className="text-xs text-slate-500">points</p>
                    </div>
                  )}

                  <div className={`px-3 py-1.5 rounded-lg border ${status.color} flex items-center gap-2`}>
                    <StatusIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{status.label}</span>
                  </div>

                  <Eye className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

// Submission Detail View
function SubmissionDetailView({
  submission,
  studentName,
  maxPoints,
  gradeInput,
  setGradeInput,
  onGrade,
  onReturn,
  grading,
}: any) {
  const canGrade = submission.state === 'TURNED_IN' || submission.state === 'RETURNED';
  const isReturned = submission.state === 'RETURNED';

  return (
    <div className="space-y-6">
      {/* Submission Content */}
      <div className="bg-slate-50 rounded-xl p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Submitted Work</h3>

        {/* Short Answer */}
        {submission.shortAnswerSubmission?.answer && (
          <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-slate-700">{submission.shortAnswerSubmission.answer}</p>
          </div>
        )}

        {/* Attachments */}
        {submission.assignmentSubmission?.attachments && submission.assignmentSubmission.attachments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 mb-2">Attachments:</p>
            {submission.assignmentSubmission.attachments.map((attachment: any, index: number) => (
              <a
                key={index}
                href={attachment.driveFile?.alternateLink || attachment.link?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-slate-700">
                  {attachment.driveFile?.title || attachment.link?.title || 'Attachment'}
                </span>
              </a>
            ))}
          </div>
        )}

        {!submission.shortAnswerSubmission?.answer && !submission.assignmentSubmission?.attachments?.length && (
          <p className="text-slate-500 text-sm">No content submitted</p>
        )}
      </div>

      {/* Grading Section */}
      {canGrade && (
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-semibold text-slate-800 mb-4">Grade Submission</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Grade {maxPoints && `(out of ${maxPoints})`}
              </label>
              <input
                type="number"
                value={gradeInput || submission.assignedGrade || ''}
                onChange={(e) => setGradeInput(e.target.value)}
                min="0"
                max={maxPoints}
                step="0.5"
                placeholder="Enter grade"
                disabled={isReturned || grading}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-slate-100"
              />
              <p className="text-xs text-slate-500 mt-1">
                Note: To add private comments, use Google Classroom directly
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onGrade}
                disabled={!gradeInput || grading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Award className="w-5 h-5" />
                {isReturned ? 'Update Grade' : 'Save Grade'}
              </button>

              {!isReturned && (
                <button
                  onClick={onReturn}
                  disabled={!submission.assignedGrade && submission.assignedGrade !== 0 || grading}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Return to Student
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!canGrade && (
        <div className="p-4 bg-slate-100 rounded-xl text-slate-600 text-center">
          Submission not yet turned in
        </div>
      )}
    </div>
  );
}
