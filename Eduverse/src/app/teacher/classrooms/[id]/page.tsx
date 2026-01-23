'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Plus,
  Users,
  Bell,
  FileText,
  Tag,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Loader2,
  BarChart3,
  Award,
  TrendingUp,
  BookOpen,
  GraduationCap
} from "lucide-react";
import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns';
import CreateAnnouncementModal from '@/components/teacher/CreateAnnouncementModal';
import CreateAssignmentModal from '@/components/teacher/CreateAssignmentModal';
import CreateTopicModal from '@/components/teacher/CreateTopicModal';

interface ClassroomDetail {
  id: string;
  name: string;
  section: string;
  enrollmentCode: string;
  description: string;
  room: string;
  alternateLink: string;
}

interface Announcement {
  id: string;
  text: string;
  creationTime: string;
  updateTime: string;
  creatorUserId: string;
  materials?: any[];
  state: string;
}

interface CourseWork {
  id: string;
  title: string;
  description?: string;
  creationTime: string;
  updateTime: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours: number; minutes: number };
  maxPoints?: number;
  state: string;
  workType: string;
  alternateLink: string;
}

interface Student {
  userId: string;
  courseId: string;
  profile: {
    id: string;
    name: {
      givenName: string;
      familyName: string;
      fullName: string;
    };
    emailAddress: string;
    photoUrl?: string;
  };
}

interface Topic {
  courseId: string;
  topicId: string;
  name: string;
  updateTime: string;
}

export default function ClassroomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const classroomId = params.id as string;

  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"stream" | "classwork" | "people" | "grades">("stream");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [courseWork, setCourseWork] = useState<CourseWork[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
      return;
    }

    if (status === 'authenticated') {
      fetchClassroomData();
    }
  }, [status, classroomId, router]);

  const fetchClassroomData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/teacher/classrooms/${classroomId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch classroom data');
      }

      const data = await response.json();
      
      setClassroom(data.classroom);
      setStudents(data.students || []);
      setAnnouncements(data.announcements || []);
      setCourseWork(data.courseWork || []);
      setTopics(data.topics || []);
    } catch (error) {
      console.error("Error fetching classroom data:", error);
      setError(error instanceof Error ? error.message : 'Failed to load classroom');
    } finally {
      setLoading(false);
    }
  };

  const copyEnrollmentCode = () => {
    if (classroom?.enrollmentCode) {
      navigator.clipboard.writeText(classroom.enrollmentCode);
      // Toast notification can be added here
    }
  };

  const formatDueDate = (dueDate: { year: number; month: number; day: number }, dueTime?: { hours: number; minutes: number }) => {
    try {
      const date = new Date(dueDate.year, dueDate.month - 1, dueDate.day, dueTime?.hours || 23, dueTime?.minutes || 59);
      return date;
    } catch {
      return null;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafbfc]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading classroom...</p>
        </div>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafbfc]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Failed to Load Classroom</h2>
          <p className="text-slate-600 mb-6">{error || 'Classroom not found'}</p>
          <button
            onClick={() => router.push('/teacher/classrooms')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all font-semibold shadow-lg"
          >
            Back to Classrooms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-32 -translate-x-32"></div>
        </div>

        <div className="relative px-8 py-8">
          {/* Back Button */}
          <button
            onClick={() => router.push('/teacher/classrooms')}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Classrooms</span>
          </button>

          {/* Classroom Info */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-5xl font-bold text-white mb-3 drop-shadow-lg">
                {classroom.name}
              </h1>
              <div className="flex items-center flex-wrap gap-4 text-white/90 mb-4">
                {classroom.section && (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                    <BookOpen className="w-4 h-4" />
                    <span className="font-medium text-lg">{classroom.section}</span>
                  </div>
                )}
                {classroom.room && (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                    <GraduationCap className="w-4 h-4" />
                    <span className="font-medium text-lg">Room {classroom.room}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                  <Users className="w-4 h-4" />
                  <span className="font-medium text-lg">{students.length} Students</span>
                </div>
              </div>
              {classroom.description && (
                <p className="text-white/80 text-lg max-w-2xl leading-relaxed">{classroom.description}</p>
              )}
            </div>

            {/* Enrollment Code Card */}
            {classroom.enrollmentCode && (
              <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-6 border-2 border-white/30 shadow-2xl hover:shadow-3xl transition-shadow">
                <div className="text-white/90 text-sm font-semibold mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Class Code
                </div>
                <div className="font-mono font-bold text-white text-4xl tracking-wider mb-4">
                  {classroom.enrollmentCode}
                </div>
                <button
                  onClick={copyEnrollmentCode}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl transition-all group font-medium text-white"
                >
                  <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Copy Code
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b-2 border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="px-8">
          <div className="flex items-center gap-1">
            {[
              { id: 'stream', label: 'Stream', icon: Bell, count: announcements.length },
              { id: 'classwork', label: 'Classwork', icon: FileText, count: courseWork.length },
              { id: 'people', label: 'People', icon: Users, count: students.length },
              { id: 'grades', label: 'Grades', icon: BarChart3 },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-8 py-5 font-semibold transition-all relative group ${
                    activeTab === tab.id
                      ? 'text-blue-600'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-lg">{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === tab.id 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-8 py-8">
        {activeTab === 'stream' && (
          <StreamTab
            announcements={announcements}
            onCreateAnnouncement={() => setShowAnnouncementModal(true)}
          />
        )}
        
        {activeTab === 'classwork' && (
          <ClassworkTab
            courseWork={courseWork}
            topics={topics}
            onCreateAssignment={() => setShowAssignmentModal(true)}
            onCreateTopic={() => setShowTopicModal(true)}
            formatDueDate={formatDueDate}
          />
        )}
        
        {activeTab === 'people' && (
          <PeopleTab students={students} />
        )}
        
        {activeTab === 'grades' && (
          <GradesTab courseWork={courseWork} students={students} />
        )}
      </div>

      {/* Modals */}
      {showAnnouncementModal && (
        <CreateAnnouncementModal
          classroomId={classroomId}
          onClose={() => setShowAnnouncementModal(false)}
          onSuccess={() => {
            setShowAnnouncementModal(false);
            fetchClassroomData();
          }}
        />
      )}

      {showAssignmentModal && (
        <CreateAssignmentModal
          classroomId={classroomId}
          topics={topics}
          onClose={() => setShowAssignmentModal(false)}
          onSuccess={() => {
            setShowAssignmentModal(false);
            fetchClassroomData();
          }}
        />
      )}

      {showTopicModal && (
        <CreateTopicModal
          classroomId={classroomId}
          onClose={() => setShowTopicModal(false)}
          onSuccess={() => {
            setShowTopicModal(false);
            fetchClassroomData();
          }}
        />
      )}
    </div>
  );
}

// Stream Tab Component
function StreamTab({ 
  announcements, 
  onCreateAnnouncement
}: { 
  announcements: Announcement[]; 
  onCreateAnnouncement: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Create Announcement Card */}
      <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 p-6 hover:shadow-md transition-shadow">
        <button
          onClick={onCreateAnnouncement}
          className="w-full flex items-center gap-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-2xl transition-all text-left group"
        >
          <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl group-hover:scale-110 transition-transform shadow-lg">
            <Bell className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-slate-800 font-semibold text-lg block">Announce something to your class</span>
            <span className="text-slate-500 text-sm">Share updates, deadlines, or important information</span>
          </div>
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 p-16 text-center">
            <div className="p-6 bg-blue-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Bell className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">No announcements yet</h3>
            <p className="text-slate-600 text-lg mb-8 max-w-md mx-auto">
              Share updates and important information with your students
            </p>
            <button
              onClick={onCreateAnnouncement}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 transition-all font-semibold shadow-lg hover:shadow-xl text-lg"
            >
              <Plus className="w-6 h-6" />
              Create First Announcement
            </button>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div 
              key={announcement.id} 
              className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 p-8 hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex items-start gap-5">
                <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  <Bell className="w-7 h-7 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 text-lg leading-relaxed whitespace-pre-wrap mb-4">{announcement.text}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{formatDistanceToNow(new Date(announcement.creationTime), { addSuffix: true })}</span>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {announcement.state}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Classwork Tab Component
function ClassworkTab({ 
  courseWork, 
  topics,
  onCreateAssignment,
  onCreateTopic,
  formatDueDate
}: { 
  courseWork: CourseWork[]; 
  topics: Topic[];
  onCreateAssignment: () => void;
  onCreateTopic: () => void;
  formatDueDate: (dueDate: { year: number; month: number; day: number }, dueTime?: { hours: number; minutes: number }) => Date | null;
}) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={onCreateAssignment}
          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl font-semibold text-lg hover:scale-105"
        >
          <Plus className="w-6 h-6" />
          Create Assignment
        </button>
        <button
          onClick={onCreateTopic}
          className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all font-semibold text-slate-700 hover:text-blue-600 text-lg hover:scale-105"
        >
          <Tag className="w-6 h-6" />
          Add Topic
        </button>
      </div>

      {/* Topics Summary */}
      {topics.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            Course Topics ({topics.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <span
                key={topic.topicId}
                className="px-4 py-2 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 rounded-xl font-medium text-sm border border-blue-200"
              >
                {topic.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Assignments List */}
      <div className="space-y-5">
        {courseWork.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 p-16 text-center">
            <div className="p-6 bg-blue-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <FileText className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">No assignments yet</h3>
            <p className="text-slate-600 text-lg mb-8 max-w-md mx-auto">
              Create assignments to give students work and track their progress
            </p>
            <button
              onClick={onCreateAssignment}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 transition-all font-semibold shadow-lg hover:shadow-xl text-lg"
            >
              <Plus className="w-6 h-6" />
              Create First Assignment
            </button>
          </div>
        ) : (
          courseWork.map((work) => {
            const dueDate = work.dueDate ? formatDueDate(work.dueDate, work.dueTime) : null;
            const isOverdue = dueDate && isPast(dueDate);
            const daysUntilDue = dueDate ? differenceInDays(dueDate, new Date()) : null;
            const isUrgent = daysUntilDue !== null && daysUntilDue <= 2 && daysUntilDue >= 0;

            return (
              <div
                key={work.id}
                className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 p-8 hover:shadow-lg hover:border-blue-200 transition-all group"
              >
                <div className="flex items-start gap-6">
                  <div className="p-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                    <FileText className="w-8 h-8 text-indigo-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title and Status */}
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-2xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {work.title}
                      </h3>
                      <span className={`px-4 py-1.5 rounded-full text-sm font-bold flex-shrink-0 ml-4 ${
                        work.state === "PUBLISHED"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {work.state}
                      </span>
                    </div>

                    {/* Description */}
                    {work.description && (
                      <p className="text-slate-600 text-lg mb-6 leading-relaxed">{work.description}</p>
                    )}

                    {/* Meta Information */}
                    <div className="flex flex-wrap items-center gap-6">
                      {dueDate && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 ${
                          isOverdue 
                            ? 'bg-red-50 border-red-200' 
                            : isUrgent 
                            ? 'bg-orange-50 border-orange-200' 
                            : 'bg-slate-50 border-slate-200'
                        }`}>
                          <Calendar className={`w-5 h-5 ${
                            isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-slate-600'
                          }`} />
                          <div>
                            <span className={`text-xs font-medium block ${
                              isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-slate-500'
                            }`}>
                              Due Date
                            </span>
                            <span className={`font-semibold ${
                              isOverdue ? 'text-red-700' : isUrgent ? 'text-orange-700' : 'text-slate-700'
                            }`}>
                              {format(dueDate, 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      )}

                      {work.maxPoints !== undefined && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border-2 border-blue-200">
                          <Award className="w-5 h-5 text-blue-600" />
                          <div>
                            <span className="text-xs font-medium text-blue-600 block">Points</span>
                            <span className="font-semibold text-blue-700">{work.maxPoints}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border-2 border-slate-200">
                        <FileText className="w-5 h-5 text-slate-600" />
                        <div>
                          <span className="text-xs font-medium text-slate-500 block">Type</span>
                          <span className="font-semibold text-slate-700">
                            {work.workType.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* View Link */}
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <a
                        href={work.alternateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold hover:gap-3 transition-all"
                      >
                        View in Google Classroom
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// People Tab Component  
function PeopleTab({ students }: { students: Student[] }) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Students</h3>
                <p className="text-slate-600">{students.length} enrolled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Students List */}
        {students.length === 0 ? (
          <div className="p-16 text-center">
            <div className="p-6 bg-blue-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Users className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">No students yet</h3>
            <p className="text-slate-600 text-lg">
              Students will appear here once they join using the class code
            </p>
          </div>
        ) : (
          <div className="divide-y-2 divide-slate-100">
            {students.map((student) => (
              <div
                key={student.userId}
                className="px-8 py-6 flex items-center justify-between hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-center gap-5">
                  {student.profile.photoUrl ? (
                    <img
                      src={student.profile.photoUrl}
                      alt={student.profile.name.fullName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 group-hover:border-blue-300 transition-colors"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl border-2 border-slate-200 group-hover:border-blue-300 transition-colors">
                      {student.profile.name.givenName[0]}{student.profile.name.familyName[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                      {student.profile.name.fullName}
                    </p>
                    <p className="text-slate-600 flex items-center gap-2 mt-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {student.profile.emailAddress}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-semibold border border-green-200">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Grades Tab Component
function GradesTab({ courseWork, students }: { courseWork: CourseWork[]; students: Student[] }) {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-3xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <FileText className="w-7 h-7" />
            </div>
            <TrendingUp className="w-6 h-6 opacity-50" />
          </div>
          <p className="text-white/80 text-sm font-medium mb-1">Total Assignments</p>
          <p className="text-4xl font-bold">{courseWork.length}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-3xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <Users className="w-7 h-7" />
            </div>
            <TrendingUp className="w-6 h-6 opacity-50" />
          </div>
          <p className="text-white/80 text-sm font-medium mb-1">Total Students</p>
          <p className="text-4xl font-bold">{students.length}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <Award className="w-7 h-7" />
            </div>
            <TrendingUp className="w-6 h-6 opacity-50" />
          </div>
          <p className="text-white/80 text-sm font-medium mb-1">Total Points</p>
          <p className="text-4xl font-bold">
            {courseWork.reduce((sum, work) => sum + (work.maxPoints || 0), 0)}
          </p>
        </div>
      </div>

      {/* Grades Table Placeholder */}
      <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 p-16 text-center">
        <div className="p-6 bg-purple-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
          <BarChart3 className="w-12 h-12 text-purple-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-800 mb-3">Grade Management</h3>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
          View and manage student submissions and grades in Google Classroom. You can grade assignments, provide feedback, and track student progress.
        </p>
      </div>
    </div>
  );
}
