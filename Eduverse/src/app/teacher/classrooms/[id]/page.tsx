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
  GraduationCap,
  Settings,
  MoreVertical,
  Search,
  Filter,
  SortDesc,
  Grid3x3,
  List,
  Download,
  Link as LinkIcon,
  Youtube,
  UserPlus,
  Sparkles,
  Target,
  Zap
} from "lucide-react";
import { format, formatDistanceToNow, isPast, differenceInDays, isToday, isTomorrow } from 'date-fns';
import CreateAnnouncementModal from '@/components/teacher/CreateAnnouncementModal';
import CreateAssignmentModal from '@/components/teacher/CreateAssignmentModal';
import CreateTopicModal from '@/components/teacher/CreateTopicModal';
import AssignmentReviewModal from '@/components/teacher/AssignmentReviewModal';

// ============================================================================
// DESIGN SYSTEM - Design Tokens & Utilities
// ============================================================================

const designSystem = {
  colors: {
    primary: 'from-blue-500 to-indigo-600',
    success: 'from-green-500 to-emerald-600',
    warning: 'from-orange-500 to-amber-600',
    danger: 'from-red-500 to-rose-600',
    purple: 'from-purple-500 to-pink-600',
  },
  spacing: {
    xs: 'p-2',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  },
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
  },
  shadow: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  }
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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
  materials?: any[];
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

// ============================================================================
// REUSABLE COMPONENTS - Building Blocks
// ============================================================================

// Metric Card Component
function MetricCard({ icon: Icon, label, value, color, trend }: {
  icon: any;
  label: string;
  value: number | string;
  color: string;
  trend?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${color} rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer group`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform"></div>
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-white/80 text-sm font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
          {trend && (
            <p className="text-white/70 text-xs mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// Action Button Component
function ActionButton({ icon: Icon, label, onClick, variant = 'primary' }: {
  icon: any;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const styles = variant === 'primary'
    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl'
    : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-3.5 rounded-xl font-semibold transition-all hover:scale-105 ${styles}`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

// Empty State Component
function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: {
  icon: any;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="p-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-6">
        <Icon className="w-16 h-16 text-blue-600" />
      </div>
      <h3 className="text-2xl font-bold text-slate-800 mb-3">{title}</h3>
      <p className="text-slate-600 text-center max-w-md mb-8 text-lg">{description}</p>
      <button
        onClick={onAction}
        className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold text-lg hover:scale-105"
      >
        <Plus className="w-6 h-6" />
        {actionLabel}
      </button>
    </div>
  );
}

// Floating Action Button Component
function FloatingActionButton({ activeTab, onAction }: {
  activeTab: string;
  onAction: (action: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = {
    stream: [
      { id: 'announcement', icon: Bell, label: 'Post Announcement', color: 'from-blue-500 to-indigo-600' },
      { id: 'material', icon: FileText, label: 'Share Material', color: 'from-purple-500 to-pink-600' },
    ],
    classwork: [
      { id: 'assignment', icon: FileText, label: 'Create Assignment', color: 'from-blue-500 to-indigo-600' },
      { id: 'topic', icon: BookOpen, label: 'Add Topic', color: 'from-green-500 to-emerald-600' },
    ],
    people: [
      { id: 'invite', icon: UserPlus, label: 'Invite Students', color: 'from-blue-500 to-indigo-600' },
    ],
  };

  const currentActions = actions[activeTab as keyof typeof actions] || [];

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {/* Action Menu */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 flex flex-col gap-3 animate-in slide-in-from-bottom-5 duration-300">
          {currentActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => {
                  onAction(action.id);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-3 px-6 py-3 bg-gradient-to-r ${action.color} text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 whitespace-nowrap font-semibold`}
              >
                <Icon className="w-5 h-5" />
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 flex items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-110 ${
          isOpen ? 'rotate-45' : ''
        }`}
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<CourseWork | null>(null);

  // View states
  const [classworkView, setClassworkView] = useState<'grid' | 'list'>('grid');
  const [classworkFilter, setClassworkFilter] = useState<'all' | 'active' | 'graded'>('all');

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

  const handleFABAction = (action: string) => {
    switch (action) {
      case 'announcement':
        setShowAnnouncementModal(true);
        break;
      case 'assignment':
        setShowAssignmentModal(true);
        break;
      case 'topic':
        setShowTopicModal(true);
        break;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafbfc]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium text-lg">Loading classroom...</p>
        </div>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafbfc]">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Failed to Load Classroom</h2>
          <p className="text-slate-600 mb-6">{error || 'Classroom not found'}</p>
          <button
            onClick={() => router.push('/teacher/classrooms')}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold shadow-lg"
          >
            Back to Classrooms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      {/* ========== HEADER SECTION ========== */}
      <header className="bg-white border-b-2 border-slate-200 shadow-sm">
        <div className="px-8 py-6">
          {/* Back Navigation */}
          <button
            onClick={() => router.push('/teacher/classrooms')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors group font-medium"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Classrooms
          </button>

          {/* Course Title & Info */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-slate-900 mb-3">
                {classroom.name}
              </h1>
              <div className="flex items-center flex-wrap gap-3">
                {classroom.section && (
                  <span className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-medium border border-blue-200">
                    <BookOpen className="w-4 h-4" />
                    {classroom.section}
                  </span>
                )}
                {classroom.room && (
                  <span className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl font-medium border border-purple-200">
                    <GraduationCap className="w-4 h-4" />
                    Room {classroom.room}
                  </span>
                )}
                {classroom.enrollmentCode && (
                  <button
                    onClick={copyEnrollmentCode}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl font-mono font-bold border border-green-200 hover:bg-green-100 transition-colors group"
                  >
                    <span className="text-sm font-normal">Code:</span>
                    {classroom.enrollmentCode}
                    <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                )}
              </div>
            </div>

            <button className="p-3 hover:bg-slate-100 rounded-xl transition-colors">
              <MoreVertical className="w-6 h-6 text-slate-600" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              icon={Users}
              label="Students"
              value={students.length}
              color={designSystem.colors.primary}
            />
            <MetricCard
              icon={FileText}
              label="Assignments"
              value={courseWork.length}
              color={designSystem.colors.success}
            />
            <MetricCard
              icon={Bell}
              label="Announcements"
              value={announcements.length}
              color={designSystem.colors.warning}
            />
            <MetricCard
              icon={Target}
              label="Topics"
              value={topics.length}
              color={designSystem.colors.purple}
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-8 -mb-0.5">
          <div className="flex items-center gap-2">
            {[
              { id: 'stream', label: 'Stream', icon: Bell, count: announcements.length },
              { id: 'classwork', label: 'Classwork', icon: FileText, count: courseWork.length },
              { id: 'people', label: 'People', icon: Users, count: students.length },
              { id: 'grades', label: 'Grades', icon: BarChart3 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex items-center gap-3 px-6 py-4 font-semibold transition-all rounded-t-xl ${
                    isActive
                      ? 'bg-[#fafbfc] text-blue-600'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-base">{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isActive 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ========== CONTENT AREA ========== */}
      <main className="px-8 py-8">
        {activeTab === 'stream' && (
          <StreamTabRedesigned
            announcements={announcements}
            courseWork={courseWork}
            onCreateAnnouncement={() => setShowAnnouncementModal(true)}
            formatDueDate={formatDueDate}
          />
        )}
        
        {activeTab === 'classwork' && (
          <ClassworkTabRedesigned
            courseWork={courseWork}
            topics={topics}
            view={classworkView}
            filter={classworkFilter}
            onViewChange={setClassworkView}
            onFilterChange={setClassworkFilter}
            onCreateAssignment={() => setShowAssignmentModal(true)}
            onCreateTopic={() => setShowTopicModal(true)}
            formatDueDate={formatDueDate}
            onAssignmentClick={(work) => {
              setSelectedAssignment(work);
              setShowReviewModal(true);
            }}
          />
        )}
        
        {activeTab === 'people' && (
          <PeopleTabRedesigned students={students} />
        )}
        
        {activeTab === 'grades' && (
          <GradesTabRedesigned courseWork={courseWork} students={students} />
        )}
      </main>

      {/* ========== FLOATING ACTION BUTTON ========== */}
      <FloatingActionButton
        activeTab={activeTab}
        onAction={handleFABAction}
      />

      {/* ========== MODALS ========== */}
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

      {showReviewModal && selectedAssignment && (
        <AssignmentReviewModal
          classroomId={classroomId}
          assignment={{
            id: selectedAssignment.id,
            title: selectedAssignment.title,
            maxPoints: selectedAssignment.maxPoints,
            description: selectedAssignment.description,
          }}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedAssignment(null);
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

// ============================================================================
// TAB COMPONENTS - Redesigned with New Structure
// ============================================================================

// Stream Tab - Feed + Sidebar Layout
function StreamTabRedesigned({ 
  announcements,
  courseWork,
  onCreateAnnouncement,
  formatDueDate
}: { 
  announcements: Announcement[];
  courseWork: CourseWork[];
  onCreateAnnouncement: () => void;
  formatDueDate: (dueDate: { year: number; month: number; day: number }, dueTime?: { hours: number; minutes: number }) => Date | null;
}) {
  // Get upcoming assignments
  const upcomingAssignments = courseWork
    .filter(work => work.dueDate)
    .map(work => ({ ...work, parsedDate: formatDueDate(work.dueDate!, work.dueTime) }))
    .filter(work => work.parsedDate && !isPast(work.parsedDate))
    .sort((a, b) => (a.parsedDate?.getTime() || 0) - (b.parsedDate?.getTime() || 0))
    .slice(0, 5);

  const hasUpcoming = upcomingAssignments.length > 0;

  return (
    <div className={`max-w-6xl mx-auto ${hasUpcoming ? 'grid grid-cols-1 lg:grid-cols-3 gap-8' : ''}`}>
      {/* Main Feed */}
      <div className={`${hasUpcoming ? 'lg:col-span-2' : ''} space-y-6`}>
        {/* Create Announcement Prompt */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6 hover:shadow-md transition-all">
          <button
            onClick={onCreateAnnouncement}
            className="w-full flex items-center gap-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-2xl transition-all text-left group"
          >
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl group-hover:scale-110 transition-transform shadow-lg flex-shrink-0">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-slate-800 font-semibold text-lg block mb-1">Share with your class</span>
              <span className="text-slate-500 text-sm">Post an announcement, reminder, or update</span>
            </div>
            <Bell className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Announcements Feed */}
        {announcements.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No announcements yet"
            description="Keep your students informed by posting updates and important information"
            actionLabel="Create First Announcement"
            onAction={onCreateAnnouncement}
          />
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <article 
                key={announcement.id} 
                className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6 hover:shadow-md hover:border-blue-200 transition-all group"
              >
                <div className="flex items-start gap-5">
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl group-hover:scale-105 transition-transform flex-shrink-0">
                    <Bell className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-800 mb-1">Class Announcement</h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {formatDistanceToNow(new Date(announcement.creationTime), { addSuffix: true })}
                          </span>
                          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            {announcement.state}
                          </span>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreVertical className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap mb-3">{announcement.text}</p>
                    
                    {/* Materials */}
                    {announcement.materials && announcement.materials.length > 0 && (
                      <div className="space-y-2 mt-4">
                        {announcement.materials.map((material: any, index: number) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                            {material.youtubeVideo && (
                              <>
                                <Youtube className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <a 
                                    href={`https://youtube.com/watch?v=${material.youtubeVideo.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-blue-600 hover:underline truncate block"
                                  >
                                    {material.youtubeVideo.title || 'YouTube Video'}
                                  </a>
                                </div>
                              </>
                            )}
                            {material.link && (
                              <>
                                <LinkIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <a 
                                    href={material.link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-blue-600 hover:underline truncate block"
                                  >
                                    {material.link.title || material.link.url}
                                  </a>
                                </div>
                              </>
                            )}
                            {material.driveFile && (
                              <>
                                <FileText className="w-5 h-5 text-green-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <a 
                                    href={material.driveFile.alternateLink || `https://drive.google.com/file/d/${material.driveFile.id}/view`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-blue-600 hover:underline truncate block"
                                  >
                                    {material.driveFile.title || 'Drive File'}
                                  </a>
                                </div>
                              </>
                            )}
                            {material.form && (
                              <>
                                <FileText className="w-5 h-5 text-purple-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <a 
                                    href={material.form.formUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-blue-600 hover:underline truncate block"
                                  >
                                    {material.form.title || 'Google Form'}
                                  </a>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar - Upcoming (only show if there are upcoming assignments) */}
      {hasUpcoming && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            Upcoming Deadlines
          </h3>

          {upcomingAssignments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No upcoming deadlines</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAssignments.map((work) => {
                const dueDate = work.parsedDate!;
                const isDueSoon = isToday(dueDate) || isTomorrow(dueDate);
                
                return (
                  <div
                    key={work.id}
                    className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                      isDueSoon
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <FileText className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        isDueSoon ? 'text-orange-600' : 'text-slate-600'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2">
                          {work.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`font-medium ${
                            isDueSoon ? 'text-orange-700' : 'text-slate-600'
                          }`}>
                            {isToday(dueDate) ? 'Due Today' : 
                             isTomorrow(dueDate) ? 'Due Tomorrow' :
                             format(dueDate, 'MMM d')}
                          </span>
                          {work.maxPoints && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-600">{work.maxPoints} pts</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

// Classwork Tab - Full width layout with optional topics filter
function ClassworkTabRedesigned({ 
  courseWork,
  topics,
  view,
  filter,
  onViewChange,
  onFilterChange,
  onCreateAssignment,
  onCreateTopic,
  formatDueDate,
  onAssignmentClick
}: { 
  courseWork: CourseWork[];
  topics: Topic[];
  view: 'grid' | 'list';
  filter: 'all' | 'active' | 'graded';
  onViewChange: (view: 'grid' | 'list') => void;
  onFilterChange: (filter: 'all' | 'active' | 'graded') => void;
  onCreateAssignment: () => void;
  onCreateTopic: () => void;
  formatDueDate: (dueDate: { year: number; month: number; day: number }, dueTime?: { hours: number; minutes: number }) => Date | null;
  onAssignmentClick: (work: CourseWork) => void;
}) {
  // Filter assignments
  const filteredWork = courseWork.filter(work => {
    if (filter === 'all') return true;
    if (filter === 'active') return work.state === 'PUBLISHED';
    if (filter === 'graded') return work.state === 'GRADED';
    return true;
  });

  const hasTopics = topics.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left side - Action buttons */}
        <div className="flex items-center gap-3">
          <ActionButton
            icon={Plus}
            label="Create Assignment"
            onClick={onCreateAssignment}
            variant="primary"
          />
          <ActionButton
            icon={BookOpen}
            label="Add Topic"
            onClick={onCreateTopic}
            variant="secondary"
          />
        </div>

        {/* Right side - Filters and view options */}
        <div className="flex items-center gap-3">
            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => onFilterChange(e.target.value as any)}
              className="px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-medium text-slate-700 hover:border-blue-300 transition-colors cursor-pointer"
            >
              <option value="all">All Assignments</option>
              <option value="active">Active Only</option>
              <option value="graded">Graded</option>
            </select>

            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 bg-white border-2 border-slate-200 rounded-xl">
              <button
                onClick={() => onViewChange('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  view === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => onViewChange('list')}
                className={`p-2 rounded-lg transition-colors ${
                  view === 'list' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      
      {/* Topics Filter Bar (if topics exist) */}
      {hasTopics && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Filter by topic:
            </span>
            <button className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm border border-blue-200 hover:bg-blue-100 transition-colors">
              All Topics ({courseWork.length})
            </button>
            {topics.map((topic) => (
              <button
                key={topic.topicId}
                className="px-4 py-2 hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-sm border border-slate-200 hover:border-slate-300 transition-colors"
              >
                {topic.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Assignments */}
      <div>
        {filteredWork.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No assignments yet"
            description="Create assignments to give students work and track their progress"
            actionLabel="Create First Assignment"
            onAction={onCreateAssignment}
          />
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-1 gap-4' : 'space-y-4'}>
            {filteredWork.map((work) => {
              const dueDate = work.dueDate ? formatDueDate(work.dueDate, work.dueTime) : null;
              const isOverdue = dueDate && isPast(dueDate);
              const daysUntilDue = dueDate ? differenceInDays(dueDate, new Date()) : null;
              const isUrgent = daysUntilDue !== null && daysUntilDue <= 2 && daysUntilDue >= 0;

              return (
                <article
                  key={work.id}
                  onClick={() => onAssignmentClick(work)}
                  className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-5 hover:shadow-lg hover:border-blue-200 transition-all group cursor-pointer"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Icon + Title & Description */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl group-hover:scale-105 transition-transform flex-shrink-0">
                          <FileText className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors mb-1 truncate">
                            {work.title}
                          </h3>
                          {work.description && (
                            <p className="text-slate-600 text-sm line-clamp-1">{work.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Status, Due Date, Points - Horizontal */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Status Badge */}
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          work.state === 'PUBLISHED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {work.state}
                        </span>

                        {/* Due Date */}
                        {dueDate && (
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                            isOverdue 
                              ? 'bg-red-50 text-red-700' 
                              : isUrgent 
                              ? 'bg-orange-50 text-orange-700' 
                              : 'bg-slate-50 text-slate-700'
                          }`}>
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium whitespace-nowrap">
                              {isOverdue ? 'Overdue' : isToday(dueDate) ? 'Due Today' : format(dueDate, 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}

                        {/* Points */}
                        {work.maxPoints !== undefined && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
                            <Award className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-xs font-semibold text-blue-700">{work.maxPoints} pts</span>
                          </div>
                        )}

                        {/* More Options */}
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                          <MoreVertical className="w-5 h-5 text-slate-400" />
                        </button>
                      </div>
                    </div>

                    {/* Materials */}
                    {work.materials && work.materials.length > 0 && (
                      <div className="space-y-2 pl-16">
                        {work.materials.map((material: any, index: number) => (
                          <div key={index} className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                            {material.youtubeVideo && (
                              <>
                                <Youtube className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <a 
                                    href={`https://youtube.com/watch?v=${material.youtubeVideo.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-blue-600 hover:underline truncate block"
                                  >
                                    {material.youtubeVideo.title || 'YouTube Video'}
                                  </a>
                                </div>
                              </>
                            )}
                            {material.link && (
                              <>
                                <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <a 
                                    href={material.link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-blue-600 hover:underline truncate block"
                                  >
                                    {material.link.title || material.link.url}
                                  </a>
                                </div>
                              </>
                            )}
                            {material.driveFile && (
                              <>
                                <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <a 
                                    href={material.driveFile.alternateLink || `https://drive.google.com/file/d/${material.driveFile.id}/view`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-blue-600 hover:underline truncate block"
                                  >
                                    {material.driveFile.title || 'Drive File'}
                                  </a>
                                </div>
                              </>
                            )}
                            {material.form && (
                              <>
                                <FileText className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <a 
                                    href={material.form.formUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-blue-600 hover:underline truncate block"
                                  >
                                    {material.form.title || 'Google Form'}
                                  </a>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// People Tab - Search + Grid
function PeopleTabRedesigned({ students }: { students: Student[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = students.filter(student =>
    student.profile.name.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.profile.emailAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header & Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Class Roster</h2>
          <p className="text-slate-600">
            <span className="font-semibold text-blue-600">{students.length}</span> students enrolled
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="pl-12 pr-4 py-3 w-80 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg font-semibold">
            <UserPlus className="w-5 h-5" />
            Invite Students
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">Active</span>
            <CheckCircle2 className="w-5 h-5 text-white/80" />
          </div>
          <p className="text-3xl font-bold">{students.length}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">Invited</span>
            <Clock className="w-5 h-5 text-white/80" />
          </div>
          <p className="text-3xl font-bold">0</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">Total</span>
            <Users className="w-5 h-5 text-white/80" />
          </div>
          <p className="text-3xl font-bold">{students.length}</p>
        </div>
      </div>

      {/* Student Grid */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 py-20 text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchQuery ? 'No students found' : 'No students yet'}
          </h3>
          <p className="text-slate-600">
            {searchQuery ? 'Try adjusting your search' : 'Students will appear here once they join using the class code'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredStudents.map((student) => (
            <div
              key={student.userId}
              className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-5 hover:shadow-lg hover:border-blue-200 transition-all group"
            >
              {/* Avatar & Name */}
              <div className="flex items-start gap-3 mb-4">
                {student.profile.photoUrl ? (
                  <img
                    src={student.profile.photoUrl}
                    alt={student.profile.name.fullName}
                    className="w-14 h-14 rounded-xl object-cover border-2 border-slate-200 group-hover:border-blue-300 transition-colors flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg border-2 border-slate-200 group-hover:border-blue-300 transition-colors flex-shrink-0">
                    {student.profile.name.givenName[0]}{student.profile.name.familyName[0]}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-base mb-1 group-hover:text-blue-600 transition-colors truncate">
                    {student.profile.name.fullName}
                  </h4>
                  <p className="text-slate-600 text-sm truncate">
                    {student.profile.emailAddress}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-200">
                  Active
                </span>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Grades Tab - Overview
function GradesTabRedesigned({ courseWork, students }: { courseWork: CourseWork[]; students: Student[] }) {
  const totalPoints = courseWork.reduce((sum, work) => sum + (work.maxPoints || 0), 0);
  const publishedAssignments = courseWork.filter(work => work.state === 'PUBLISHED').length;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-5">
        <MetricCard
          icon={FileText}
          label="Total Assignments"
          value={courseWork.length}
          color={designSystem.colors.primary}
          trend="+2 this week"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Published"
          value={publishedAssignments}
          color={designSystem.colors.success}
        />
        <MetricCard
          icon={Users}
          label="Students"
          value={students.length}
          color={designSystem.colors.warning}
        />
        <MetricCard
          icon={Award}
          label="Total Points"
          value={totalPoints}
          color={designSystem.colors.purple}
        />
      </div>

      {/* Gradebook Placeholder */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-16 text-center">
        <div className="p-8 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
          <BarChart3 className="w-16 h-16 text-purple-600" />
        </div>
        <h3 className="text-3xl font-bold text-slate-800 mb-4">Interactive Gradebook</h3>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto mb-8">
          View and manage student submissions and grades in Google Classroom. You can grade assignments, provide feedback, and track student progress.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg font-semibold">
            <BarChart3 className="w-5 h-5" />
            View in Google Classroom
          </button>
          <button className="flex items-center gap-2 px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all font-semibold">
            <Download className="w-5 h-5" />
            Export Grades
          </button>
        </div>
      </div>
    </div>
  );
}
