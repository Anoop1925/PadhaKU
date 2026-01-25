"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  FileText,
  Users,
  MessageSquare,
  Calendar,
  Paperclip,
  Send,
  Download,
  ExternalLink,
  Loader2,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  GraduationCap,
  Play,
  Link as LinkIcon,
  Search,
} from "lucide-react";

interface Course {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  room?: string;
  ownerId: string;
  courseState: string;
}

interface Announcement {
  id: string;
  text: string;
  creatorUserId: string;
  creationTime: string;
  updateTime: string;
  materials?: Material[];
}

interface CourseWork {
  id: string;
  title: string;
  description?: string;
  materials?: Material[];
  state: string;
  creationTime: string;
  updateTime: string;
  dueDate?: {
    year: number;
    month: number;
    day: number;
  };
  dueTime?: {
    hours: number;
    minutes: number;
  };
  maxPoints?: number;
  workType?: string;
  submissionModificationMode?: string;
}

// Extended CourseWork with submission state for display
interface CourseWorkWithSubmission extends CourseWork {
  submission?: StudentSubmission;
  submissionState?: 'ASSIGNED' | 'TURNED_IN' | 'RETURNED' | 'MISSING' | 'CREATED';
  isDue?: boolean;
  isLate?: boolean;
}

interface Material {
  driveFile?: {
    driveFile: {
      id: string;
      title: string;
      alternateLink: string;
      thumbnailUrl?: string;
    };
  };
  youtubeVideo?: {
    id: string;
    title: string;
    alternateLink: string;
    thumbnailUrl?: string;
  };
  link?: {
    url: string;
    title?: string;
    thumbnailUrl?: string;
  };
  form?: {
    formUrl: string;
    title: string;
    thumbnailUrl?: string;
  };
}

interface StudentSubmission {
  id: string;
  userId: string;
  courseWorkId: string;
  courseWorkType: string;
  creationTime: string;
  updateTime: string;
  state: 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT';
  late?: boolean;
  assignedGrade?: number;
  draftGrade?: number;
  assignmentSubmission?: {
    attachments?: Array<{
      driveFile?: any;
      youTubeVideo?: any;
      link?: any;
      form?: any;
    }>;
  };
  shortAnswerSubmission?: {
    answer: string;
  };
  multipleChoiceSubmission?: {
    answer: string;
  };
  submissionHistory?: Array<{
    stateHistory: {
      state: string;
      stateTimestamp: string;
      actorUserId: string;
    };
    gradeHistory: {
      pointsEarned: number;
      maxPoints: number;
      gradeTimestamp: string;
      actorUserId: string;
      gradeChangeType: string;
    };
  }>;
  associatedWithDeveloper?: boolean;
  courseId?: string;
  alternateLink?: string;
}

interface ClassMember {
  userId: string;
  profile: {
    id: string;
    name: {
      fullName: string;
      givenName: string;
      familyName: string;
    };
    emailAddress: string;
    photoUrl?: string;
  };
}

export default function StudentClassroomPage() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [courseWork, setCourseWork] = useState<CourseWorkWithSubmission[]>([]);
  const [students, setStudents] = useState<ClassMember[]>([]);
  const [teachers, setTeachers] = useState<ClassMember[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<CourseWorkWithSubmission | null>(null);
  const [submission, setSubmission] = useState<StudentSubmission | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [newAttachments, setNewAttachments] = useState<Array<{type: 'link', url: string, title: string}>>([]);
  const [linkInput, setLinkInput] = useState({ url: '', title: '' });
  const [activeTab, setActiveTab] = useState<"stream" | "classwork" | "people">("stream");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const classroomColors = [
    "from-red-400 to-pink-500",
    "from-yellow-400 to-orange-500",
    "from-green-400 to-emerald-500",
    "from-blue-400 to-cyan-500",
    "from-purple-400 to-indigo-500",
    "from-pink-400 to-rose-500",
    "from-teal-400 to-green-500",
    "from-orange-400 to-red-500",
  ];

  const filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.section?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (session) {
      fetchCourses();
    }
  }, [session]);

  // Fetch course details when a course is selected
  useEffect(() => {
    if (selectedCourse) {
      fetchCourseDetails();
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/classroom/courses");
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseDetails = async () => {
    if (!selectedCourse) return;

    try {
      setLoading(true);
      
      // Step 1: Fetch announcements, coursework, and members in parallel
      const [announcementsRes, courseWorkRes, membersRes] = await Promise.all([
        fetch(`/api/classroom/announcements?courseId=${selectedCourse.id}`),
        fetch(`/api/classroom/coursework?courseId=${selectedCourse.id}`),
        fetch(`/api/classroom/students?courseId=${selectedCourse.id}`),
      ]);

      const announcementsData = await announcementsRes.json();
      const courseWorkData = await courseWorkRes.json();
      const membersData = await membersRes.json();

      setAnnouncements(announcementsData.announcements || []);
      setStudents(membersData.students || []);
      setTeachers(membersData.teachers || []);

      // Step 2: For each coursework item, fetch the student's submission state
      // This is critical for showing proper status badges
      const courseWorkItems: CourseWork[] = courseWorkData.courseWork || [];
      const courseWorkWithSubmissions: CourseWorkWithSubmission[] = await Promise.all(
        courseWorkItems.map(async (work) => {
          try {
            // Fetch student's submission for this coursework
            const submissionRes = await fetch(
              `/api/classroom/submissions?courseId=${selectedCourse.id}&courseWorkId=${work.id}`
            );
            const submissionData = await submissionRes.json();
            const studentSubmission = submissionData.studentSubmissions?.[0];

            // Determine submission state
            let submissionState: 'ASSIGNED' | 'TURNED_IN' | 'RETURNED' | 'MISSING' | 'CREATED' = 'ASSIGNED';
            let isDue = false;
            let isLate = false;

            if (studentSubmission) {
              // Map Google Classroom states
              if (studentSubmission.state === 'TURNED_IN') {
                submissionState = 'TURNED_IN';
              } else if (studentSubmission.state === 'RETURNED') {
                submissionState = 'RETURNED';
              } else if (studentSubmission.state === 'CREATED') {
                submissionState = 'CREATED'; // Student has started but not turned in
              } else if (studentSubmission.state === 'NEW') {
                submissionState = 'ASSIGNED'; // Not started yet
              }

              isLate = studentSubmission.late || false;
            }

            // Check if assignment is past due
            if (work.dueDate && !studentSubmission?.state.includes('TURNED_IN') && !studentSubmission?.state.includes('RETURNED')) {
              const dueDateTime = new Date(
                work.dueDate.year,
                work.dueDate.month - 1,
                work.dueDate.day,
                work.dueTime?.hours || 23,
                work.dueTime?.minutes || 59
              );
              const now = new Date();
              if (now > dueDateTime) {
                submissionState = 'MISSING';
                isDue = true;
              }
            }

            return {
              ...work,
              submission: studentSubmission,
              submissionState,
              isDue,
              isLate,
            };
          } catch (error) {
            console.error(`Error fetching submission for ${work.id}:`, error);
            return {
              ...work,
              submissionState: 'ASSIGNED' as const,
              isDue: false,
              isLate: false,
            };
          }
        })
      );

      setCourseWork(courseWorkWithSubmissions);
    } catch (error) {
      console.error("Error fetching course details:", error);
    } finally {
      setLoading(false);
    }
  };

  // Opens assignment detail modal
  const handleAssignmentClick = async (assignment: CourseWorkWithSubmission) => {
    setSelectedAssignment(assignment);
    setSubmission(assignment.submission || null);
    
    // Reset form state
    setSubmissionText("");
    setNewAttachments([]);
    setLinkInput({ url: '', title: '' });
    
    // If submission exists and has answer, pre-fill it
    if (assignment.submission?.shortAnswerSubmission?.answer) {
      setSubmissionText(assignment.submission.shortAnswerSubmission.answer);
    }
  };

  // Add link attachment (before turn-in)
  const handleAddLink = () => {
    if (!linkInput.url.trim()) return;
    
    setNewAttachments([
      ...newAttachments,
      {
        type: 'link',
        url: linkInput.url,
        title: linkInput.title || linkInput.url
      }
    ]);
    setLinkInput({ url: '', title: '' });
  };

  // Remove attachment from pending list
  const handleRemoveAttachment = (index: number) => {
    setNewAttachments(newAttachments.filter((_, i) => i !== index));
  };

  // Save attachments without turning in (modifyAttachments)
  const handleSaveAttachments = async () => {
    if (!selectedCourse || !selectedAssignment || !submission) return;
    if (newAttachments.length === 0 && !submissionText.trim()) return;

    try {
      setSubmitting(true);

      const attachmentsToAdd = [];

      // Add text as short answer if provided
      if (submissionText.trim()) {
        // For short answer, we'll include it in the turn-in call
        // Google Classroom doesn't support modifying short answer separately
      }

      // Add link attachments
      for (const attachment of newAttachments) {
        if (attachment.type === 'link') {
          attachmentsToAdd.push({
            link: {
              url: attachment.url,
              title: attachment.title
            }
          });
        }
      }

      if (attachmentsToAdd.length > 0) {
        await fetch("/api/classroom/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: selectedCourse.id,
            courseWorkId: selectedAssignment.id,
            submissionId: submission.id,
            action: "modifyAttachments",
            attachments: attachmentsToAdd,
          }),
        });
      }

      // Refresh submission state
      await fetchCourseDetails();
      alert("Work saved! Remember to turn in when you're ready.");
    } catch (error) {
      console.error("Error saving attachments:", error);
      alert("Failed to save work");
    } finally {
      setSubmitting(false);
    }
  };

  // Turn in assignment (locks editing)
  const handleTurnInAssignment = async () => {
    if (!selectedCourse || !selectedAssignment || !submission) return;

    // Confirm turn in
    if (!confirm("Are you sure you want to turn in this assignment? You won't be able to edit it after submitting.")) {
      return;
    }

    try {
      setSubmitting(true);

      // Step 1: Save any pending attachments or text
      if (newAttachments.length > 0 || submissionText.trim()) {
        await handleSaveAttachments();
      }

      // Step 2: Turn in the assignment
      const turnInResponse = await fetch("/api/classroom/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          courseWorkId: selectedAssignment.id,
          submissionId: submission.id,
          action: "turnIn",
        }),
      });

      if (!turnInResponse.ok) {
        throw new Error("Failed to turn in assignment");
      }

      // Refresh course data to update status badges
      await fetchCourseDetails();
      setSelectedAssignment(null);
      alert("Assignment turned in successfully!");
    } catch (error) {
      console.error("Error turning in assignment:", error);
      alert("Failed to turn in assignment");
    } finally {
      setSubmitting(false);
    }
  };

  // Unsubmit assignment (reclaim) - allows student to edit again
  const handleReclaimAssignment = async () => {
    if (!selectedCourse || !selectedAssignment || !submission) return;

    if (!confirm("Do you want to unsubmit this assignment? You can make changes and resubmit.")) {
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/classroom/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          courseWorkId: selectedAssignment.id,
          submissionId: submission.id,
          action: "reclaim",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reclaim assignment");
      }

      // Refresh to show updated state
      await fetchCourseDetails();
      alert("Assignment unsubmitted. You can now make changes.");
    } catch (error) {
      console.error("Error reclaiming assignment:", error);
      alert("Failed to unsubmit assignment");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to get status badge styling
  const getStatusBadge = (state: 'ASSIGNED' | 'TURNED_IN' | 'RETURNED' | 'MISSING' | 'CREATED') => {
    switch (state) {
      case 'TURNED_IN':
        return { text: 'Turned In', className: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'RETURNED':
        return { text: 'Graded', className: 'bg-green-100 text-green-800 border-green-200' };
      case 'MISSING':
        return { text: 'Missing', className: 'bg-red-100 text-red-800 border-red-200' };
      case 'CREATED':
        return { text: 'In Progress', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 'ASSIGNED':
      default:
        return { text: 'Assigned', className: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const formatDate = (dateObj: any, timeObj?: any) => {
    if (!dateObj) return "No due date";
    const date = new Date(
      dateObj.year,
      dateObj.month - 1,
      dateObj.day,
      timeObj?.hours || 23,
      timeObj?.minutes || 59
    );
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: timeObj ? "numeric" : undefined,
      minute: timeObj ? "2-digit" : undefined,
    });
  };

  const renderMaterials = (materials: Material[] | undefined) => {
    if (!materials || materials.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Attachments</p>
        {materials.map((material, index) => {
          if (material.driveFile) {
            const file = material.driveFile.driveFile;
            return (
              <a
                key={index}
                href={file.alternateLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors group"
              >
                <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span className="flex-1 text-sm font-medium text-slate-800 truncate">{file.title}</span>
                <ExternalLink className="h-4 w-4 text-blue-600" />
              </a>
            );
          }
          if (material.youtubeVideo) {
            const video = material.youtubeVideo;
            return (
              <a
                key={index}
                href={video.alternateLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 transition-colors group"
              >
                <div className="w-8 h-8 rounded-md bg-red-600 flex items-center justify-center flex-shrink-0">
                  <Play className="h-4 w-4 text-white fill-white" />
                </div>
                <span className="flex-1 text-sm font-medium text-slate-800 truncate">{video.title}</span>
                <ExternalLink className="h-4 w-4 text-red-600" />
              </a>
            );
          }
          if (material.link) {
            return (
              <a
                key={index}
                href={material.link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors group"
              >
                <div className="w-8 h-8 rounded-md bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <LinkIcon className="h-4 w-4 text-white" />
                </div>
                <span className="flex-1 text-sm font-medium text-slate-800 truncate">
                  {material.link.title || "Link"}
                </span>
                <ExternalLink className="h-4 w-4 text-purple-600" />
              </a>
            );
          }
          return null;
        })}
      </div>
    );
  };

  if (loading && !selectedCourse) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-[#fafbfc]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading classrooms...</p>
        </div>
      </div>
    );
  }

  if (!selectedCourse) {
    return (
      <div className="p-6 space-y-5 bg-[#fafbfc] min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">
              My Classrooms
            </h1>
            <p className="text-sm text-slate-600">
              View assignments, announcements, and course materials
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-sm">
            <GraduationCap className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total Classes</p>
              <p className="text-base font-bold text-slate-800">{courses.length}</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search classrooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        
        {filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-20 w-20 text-slate-300 mb-4" />
              <h2 className="text-xl font-semibold text-slate-700 mb-2">
                {searchQuery ? "No classrooms found" : "No classrooms yet"}
              </h2>
              <p className="text-slate-500 text-center">
                {searchQuery 
                  ? "Try adjusting your search" 
                  : "You haven't joined any classrooms. Contact your teacher to get a class code."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course, index) => (
              <div
                key={course.id}
                onClick={() => setSelectedCourse(course)}
                className="group cursor-pointer"
              >
                <Card className="h-full hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border border-slate-200 overflow-hidden">
                  <div className={`h-24 bg-gradient-to-br ${classroomColors[index % classroomColors.length]} p-4 relative`}>
                    <div className="relative z-10">
                      <h3 className="text-white font-semibold text-base mb-0.5 line-clamp-2">
                        {course.name}
                      </h3>
                      {course.section && (
                        <p className="text-white/90 text-xs font-medium">
                          {course.section}
                        </p>
                      )}
                    </div>
                    <BookOpen className="absolute bottom-2 right-2 w-8 h-8 text-white/10" />
                  </div>
                  <CardContent className="p-3">
                    {course.room && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span>Room: {course.room}</span>
                      </div>
                    )}
                    {course.descriptionHeading && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                        {course.descriptionHeading}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-blue-600 font-medium text-xs group-hover:gap-2 transition-all">
                      <span>Open Classroom</span>
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Classroom detail view with tabs
  return (
    <div className="p-6 space-y-5 bg-[#fafbfc] min-h-screen">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => setSelectedCourse(null)}
        className="hover:bg-slate-100 h-9 text-sm"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Classrooms
      </Button>

      {/* Classroom Header */}
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{selectedCourse.name}</h1>
                {selectedCourse.section && (
                  <p className="text-blue-100 text-sm mt-0.5">{selectedCourse.section}</p>
                )}
              </div>
            </div>
            {selectedCourse.room && (
              <p className="text-xs text-blue-100 ml-13">Room: {selectedCourse.room}</p>
            )}
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-center">
              <p className="text-[10px] text-blue-100 uppercase tracking-wide mb-0.5">Teachers</p>
              <p className="text-xl font-bold">{teachers.length}</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-center">
              <p className="text-[10px] text-blue-100 uppercase tracking-wide mb-0.5">Students</p>
              <p className="text-xl font-bold">{students.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "stream" | "classwork" | "people")} className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
          <TabsTrigger 
            value="stream" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-6 py-2.5 font-medium text-sm transition-all"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Stream
          </TabsTrigger>
          <TabsTrigger 
            value="classwork"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-6 py-2.5 font-medium text-sm transition-all"
          >
            <FileText className="h-4 w-4 mr-2" />
            Classwork
          </TabsTrigger>
          <TabsTrigger 
            value="people"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-6 py-2.5 font-medium text-sm transition-all"
          >
            <Users className="h-4 w-4 mr-2" />
            People
          </TabsTrigger>
        </TabsList>

        {/* Stream Tab */}
        <TabsContent value="stream" className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Announcements */}
              {announcements.map((announcement) => (
                <Card key={announcement.id} className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-500 flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="secondary" className="bg-pink-50 text-pink-700 border-pink-200 text-xs px-2 py-0.5">
                            Announcement
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(announcement.creationTime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{announcement.text}</p>
                        {renderMaterials(announcement.materials)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Assignments */}
              {courseWork.map((work) => {
                const statusBadge = work.submissionState ? getStatusBadge(work.submissionState) : null;
                
                return (
                  <Card
                    key={work.id}
                    className="border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => handleAssignmentClick(work)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {work.title}
                            </h3>
                            {statusBadge && (
                              <Badge className={`text-xs px-2 py-0.5 ${statusBadge.className}`}>
                                {statusBadge.text}
                              </Badge>
                            )}
                            {work.maxPoints && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs font-medium px-2 py-0.5 ml-auto flex-shrink-0">
                                {work.maxPoints} pts
                              </Badge>
                            )}
                          </div>
                          {work.dueDate && (
                            <div className="flex items-center gap-1.5 text-xs mb-1.5">
                              <Clock className="w-4 h-4 text-orange-500" />
                              <span className={work.isDue ? 'text-red-600 font-medium' : 'text-slate-600'}>
                                Due: {formatDate(work.dueDate, work.dueTime)}
                                {work.isLate && ' (Late)'}
                              </span>
                            </div>
                          )}
                          {work.description && (
                            <p className="text-xs text-slate-600 line-clamp-2 mb-1.5">
                              {work.description}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 text-blue-600 font-medium text-xs group-hover:gap-2 transition-all">
                            <span>View Assignment</span>
                            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {announcements.length === 0 && courseWork.length === 0 && (
                <Card className="border-0 shadow-md">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <MessageSquare className="h-10 w-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No posts yet</h3>
                    <p className="text-slate-500">Check back later for announcements and assignments</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Classwork Tab */}
        <TabsContent value="classwork" className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            </div>
          ) : courseWork.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <FileText className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No classwork yet</h3>
                <p className="text-slate-500">Assignments will appear here when posted</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {courseWork.map((work) => {
                const statusBadge = work.submissionState ? getStatusBadge(work.submissionState) : null;
                const showGrade = work.submissionState === 'RETURNED' && work.submission?.assignedGrade !== undefined;
                
                return (
                  <Card key={work.id} className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-base font-semibold text-slate-900">{work.title}</h3>
                              {statusBadge && (
                                <Badge className={`text-xs px-2 py-0.5 ${statusBadge.className}`}>
                                  {statusBadge.text}
                                </Badge>
                              )}
                            </div>
                            {work.dueDate && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span className={work.isDue ? 'text-red-600 font-medium' : ''}>
                                  Due: {formatDate(work.dueDate, work.dueTime)}
                                  {work.isLate && ' (Late)'}
                                </span>
                              </div>
                            )}
                            {showGrade && (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 mt-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>
                                  Grade: {work.submission?.assignedGrade}/{work.maxPoints} pts
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {work.maxPoints && !showGrade && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs font-medium px-2 py-0.5 flex-shrink-0">
                            {work.maxPoints} pts
                          </Badge>
                        )}
                      </div>
                      {work.description && (
                        <p className="text-xs text-slate-600 mb-2 line-clamp-2">{work.description}</p>
                      )}
                      {renderMaterials(work.materials)}
                      <Button 
                        onClick={() => handleAssignmentClick(work)}
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-700 h-9 text-sm"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {showGrade ? 'View Grade' : work.submissionState === 'TURNED_IN' ? 'View Submission' : 'Open Assignment'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* People Tab */}
        <TabsContent value="people" className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Teachers */}
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">Teachers</CardTitle>
                      <p className="text-sm text-slate-500">{teachers.length} instructor{teachers.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                  {teachers.map((teacher) => (
                    <div
                      key={teacher.userId}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                        <AvatarImage src={teacher.profile.photoUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-indigo-500 text-white font-semibold">
                          {teacher.profile.name.givenName[0]}
                          {teacher.profile.name.familyName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {teacher.profile.name.fullName}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {teacher.profile.emailAddress}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Students */}
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">Classmates</CardTitle>
                      <p className="text-sm text-slate-500">{students.length} student{students.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                  {students.map((student) => (
                    <div
                      key={student.userId}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                        <AvatarImage src={student.profile.photoUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-green-400 to-emerald-500 text-white font-semibold">
                          {student.profile.name.givenName[0]}
                          {student.profile.name.familyName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {student.profile.name.fullName}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {student.profile.emailAddress}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Assignment Submission Dialog - Google Classroom Flow */}
      <Dialog
        open={!!selectedAssignment}
        onOpenChange={() => setSelectedAssignment(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-xl text-slate-900 mb-2">
                    {selectedAssignment?.title}
                  </DialogTitle>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {selectedAssignment?.dueDate && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span>Due {formatDate(selectedAssignment.dueDate, selectedAssignment.dueTime)}</span>
                      </div>
                    )}
                    {selectedAssignment?.maxPoints && (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        {selectedAssignment.maxPoints} pts
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {selectedAssignment?.submissionState && (
                <Badge className={`${getStatusBadge(selectedAssignment.submissionState).className}`}>
                  {getStatusBadge(selectedAssignment.submissionState).text}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            {/* Instructions */}
            {selectedAssignment?.description && (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <h3 className="font-medium text-slate-900 mb-2">Instructions</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedAssignment.description}
                </p>
              </div>
            )}

            {/* Teacher Materials */}
            {selectedAssignment?.materials && selectedAssignment.materials.length > 0 && (
              <div>
                {renderMaterials(selectedAssignment.materials)}
              </div>
            )}

            <Separator />

            {/* STATE: RETURNED - Show Grade & Feedback */}
            {submission?.state === "RETURNED" && (
              <div className="space-y-4">
                <div className="p-5 rounded-lg bg-green-50 border-2 border-green-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900 text-lg mb-1">Assignment Graded</p>
                      {submission.assignedGrade !== undefined && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-2xl font-bold text-green-700">
                            {submission.assignedGrade} / {selectedAssignment?.maxPoints}
                          </span>
                          <span className="text-sm text-green-600">points</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Show submitted work */}
                {submission.assignmentSubmission?.attachments && submission.assignmentSubmission.attachments.length > 0 && (
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">Your Submission</h3>
                    {renderMaterials(submission.assignmentSubmission.attachments)}
                  </div>
                )}

                <DialogFooter>
                  <Button onClick={() => setSelectedAssignment(null)} variant="outline">
                    Close
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* STATE: TURNED_IN - Submitted, waiting for grade */}
            {submission?.state === "TURNED_IN" && (
              <div className="space-y-4">
                <div className="p-5 rounded-lg bg-blue-50 border-2 border-blue-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900 text-lg">Turned In</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Your work has been submitted. You'll be notified when it's graded.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Show submitted work */}
                {submission.assignmentSubmission?.attachments && submission.assignmentSubmission.attachments.length > 0 && (
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">Your Submission</h3>
                    {renderMaterials(submission.assignmentSubmission.attachments)}
                  </div>
                )}

                {submission.shortAnswerSubmission?.answer && (
                  <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
                    <p className="text-sm text-slate-700">{submission.shortAnswerSubmission.answer}</p>
                  </div>
                )}

                <DialogFooter className="gap-2">
                  <Button onClick={() => setSelectedAssignment(null)} variant="outline">
                    Close
                  </Button>
                  {selectedAssignment?.submissionModificationMode !== 'SUBMISSION_MODIFICATION_MODE_UNSPECIFIED' && (
                    <Button 
                      onClick={handleReclaimAssignment}
                      disabled={submitting}
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Unsubmit
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}

            {/* STATE: NEW, CREATED, RECLAIMED - Can edit and submit */}
            {(!submission || submission.state === "NEW" || submission.state === "CREATED" || submission.state === "RECLAIMED_BY_STUDENT") && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-medium text-slate-900">Your Work</h3>
                  
                  {/* Text Input */}
                  <div className="space-y-2">
                    <textarea
                      placeholder="Type your answer here or add links below..."
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      disabled={submitting}
                      className="w-full min-h-[120px] p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm"
                    />
                  </div>

                  {/* Add Link */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Add Link</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Paste link (Google Doc, Drive, etc.)"
                        value={linkInput.url}
                        onChange={(e) => setLinkInput({ ...linkInput, url: e.target.value })}
                        disabled={submitting}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleAddLink}
                        disabled={!linkInput.url.trim() || submitting}
                        size="sm"
                        variant="outline"
                      >
                        <Paperclip className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Show pending attachments */}
                  {newAttachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">Attachments</p>
                      {newAttachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 border border-slate-200">
                          <LinkIcon className="w-4 h-4 text-slate-600" />
                          <span className="flex-1 text-sm text-slate-700 truncate">{att.title}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAttachment(idx)}
                            disabled={submitting}
                          >
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show existing submission attachments */}
                  {submission?.assignmentSubmission?.attachments && submission.assignmentSubmission.attachments.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Previously Added</p>
                      {renderMaterials(submission.assignmentSubmission.attachments)}
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2">
                  <Button onClick={() => setSelectedAssignment(null)} variant="outline" disabled={submitting}>
                    Close
                  </Button>
                  {(newAttachments.length > 0 || submissionText.trim()) && (
                    <Button
                      onClick={handleSaveAttachments}
                      disabled={submitting}
                      variant="outline"
                      className="border-blue-300"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Save Draft
                    </Button>
                  )}
                  <Button
                    onClick={handleTurnInAssignment}
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Turn In
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
