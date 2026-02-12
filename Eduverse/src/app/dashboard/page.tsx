"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { User, Megaphone, BookOpen, ClipboardList, Hand, GraduationCap, CheckCircle2, Clock, Bell, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trophy, BarChart3 } from "lucide-react"; // Icon imports
import { addDays, format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns';

interface Course {
  id: string;
  name: string;
  section?: string;
}

interface Announcement {
  id: string;
  text: string;
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Record<string, Announcement[]>>({});
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>({});
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  
  // Profile data states
  const [totalPoints, setTotalPoints] = useState(0);
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null);
  const [coursesCompleted, setCoursesCompleted] = useState(0);
  const [chaptersCompleted, setChaptersCompleted] = useState(0);
  const [profileDataLoading, setProfileDataLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (session === null) {
      router.push("/sign-in");
    }
  }, [session, router]);

  // Fetch user points and statistics from Supabase
  useEffect(() => {
    if (!session?.user?.email) return;

    const fetchProfileData = async () => {
      try {
        setProfileDataLoading(true);
        
        // Fetch leaderboard data which includes everything we need
        const leaderboardResponse = await fetch('/api/feature-5/leaderboard');
        const leaderboardData = await leaderboardResponse.json();
        
        console.log('Leaderboard data:', leaderboardData);
        
        // Find current user in leaderboard by email OR name
        let userEntry = null;
        let userRankIndex = -1;
        
        if (leaderboardData.leaderboard && leaderboardData.leaderboard.length > 0) {
          // First try to find by email
          userRankIndex = leaderboardData.leaderboard.findIndex((entry: any) => 
            entry.userEmail.toLowerCase() === session?.user?.email?.toLowerCase()
          );
          
          // If not found by email, try by name matching
          if (userRankIndex === -1 && session?.user?.name) {
            const userName = session.user.name.toLowerCase();
            const userFirstName = session.user.name.split(' ')[0].toLowerCase();
            
            userRankIndex = leaderboardData.leaderboard.findIndex((entry: any) => {
              const entryName = entry.displayName.toLowerCase();
              const entryFirstName = entry.displayName.split(' ')[0].toLowerCase();
              return entryName.includes(userFirstName) || 
                     userName.includes(entryFirstName) ||
                     userFirstName === entryFirstName;
            });
          }
          
          if (userRankIndex !== -1) {
            userEntry = leaderboardData.leaderboard[userRankIndex];
            console.log('User entry found:', userEntry);
          }
        }
        
        // Set the profile data
        if (userEntry) {
          setTotalPoints(userEntry.points || 0);
          setCoursesCompleted(userEntry.totalCoursesCompleted || 0);
          setChaptersCompleted(userEntry.totalChaptersCompleted || 0);
          setWeeklyRank(userEntry.rank || null);
        } else {
          // User not in leaderboard yet, set defaults
          console.log('User not found in leaderboard, setting defaults');
          setTotalPoints(0);
          setCoursesCompleted(0);
          setChaptersCompleted(0);
          setWeeklyRank(null);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setProfileDataLoading(false);
      }
    };

    fetchProfileData();
  }, [session]);

  useEffect(() => {
    if (!session?.accessToken) return;

    fetch("https://classroom.googleapis.com/v1/courses", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setCourses(data.courses || []);
        if (data.courses?.[0]) setSelectedCourseId(data.courses[0].id);
      });
  }, [session]);

  useEffect(() => {
    if (!session?.accessToken || !selectedCourseId) return;

    fetch(`https://classroom.googleapis.com/v1/courses/${selectedCourseId}/announcements`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setAnnouncements((prev) => ({
          ...prev,
          [selectedCourseId]: data.announcements || [],
        }));
      });

    fetch(`https://classroom.googleapis.com/v1/courses/${selectedCourseId}/courseWork`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setAssignments((prev) => ({
          ...prev,
          [selectedCourseId]: data.courseWork || [],
        }));
      });
  }, [selectedCourseId, session]);

  // --- Dashboard Layout ---
  // Monthly calendar state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startingDayOfWeek = getDay(monthStart);
  
  // KPI calculations
  const totalClasses = courses.length;
  const allAssignments = Object.values(assignments).flat();
  const assignmentsCompleted = Math.floor(allAssignments.length * 0.7); // Mock completion rate
  const assignmentsPending = allAssignments.length - assignmentsCompleted;
  const nextDeadline = allAssignments[0]?.title || "No upcoming deadlines";

  // Assignment color palette with crayonish gradients
  const assignmentColorPalettes = [
    { bg: 'bg-gradient-to-br from-red-100 to-rose-100', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-200 text-red-800' },
    { bg: 'bg-gradient-to-br from-orange-100 to-amber-100', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-200 text-orange-800' },
    { bg: 'bg-gradient-to-br from-yellow-100 to-lime-100', text: 'text-yellow-700', border: 'border-yellow-200', badge: 'bg-yellow-200 text-yellow-800' },
    { bg: 'bg-gradient-to-br from-emerald-100 to-teal-100', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-200 text-emerald-800' },
    { bg: 'bg-gradient-to-br from-blue-100 to-cyan-100', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-200 text-blue-800' },
    { bg: 'bg-gradient-to-br from-blue-100 to-blue-100', text: 'text-[#387BFF]', border: 'border-blue-200', badge: 'bg-blue-200 text-blue-800' },
    { bg: 'bg-gradient-to-br from-purple-100 to-fuchsia-100', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-200 text-purple-800' },
    { bg: 'bg-gradient-to-br from-pink-100 to-rose-100', text: 'text-pink-700', border: 'border-pink-200', badge: 'bg-pink-200 text-pink-800' },
  ];

  // Get random color for each assignment based on its ID
  const getColorForAssignment = (assignmentId: string) => {
    const hash = assignmentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return assignmentColorPalettes[hash % assignmentColorPalettes.length];
  };
  
  const getAssignmentsForDay = (day: Date) => {
    // Mock: randomly assign some assignments to days with course information
    const dayNum = parseInt(format(day, 'd'));
    const monthAssignments = allAssignments.slice(0, Math.min(15, allAssignments.length));
    return monthAssignments
      .filter((_, idx) => (idx * 3 + 1) % 30 === (dayNum - 1) % 30)
      .map(assignment => {
        // Find the course for this assignment
        const courseId = Object.keys(assignments).find(cId => 
          assignments[cId].some(a => a.id === assignment.id)
        );
        const course = courses.find(c => c.id === courseId);
        return {
          ...assignment,
          courseName: course?.name || 'Unknown Course',
          courseSection: course?.section || '',
        };
      });
  };

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    setSelectedDay(null);
  };
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    setSelectedDay(null);
  };

  const scrollToCalendar = () => {
    const calendarElement = document.getElementById('calendar-section');
    if (calendarElement) {
      calendarElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fafbfc]">
      {/* Top Bar */}
      <div className="px-8 py-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-3xl mx-6 mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/90 flex items-center justify-center backdrop-blur-sm">
              <User className="w-8 h-8 text-[#444fd6]" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">Welcome back!</div>
              <div className="text-base text-white/80">
                Here&apos;s your learning progress and upcoming activities.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={scrollToCalendar}
              className="px-7 py-3.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 transition-colors flex items-center gap-2"
            >
              <CalendarIcon className="w-5 h-5 text-white" />
              <span className="text-white text-base font-medium">View Schedule</span>
            </button>
            <div className="px-7 py-3.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
              <div className="text-xs font-medium text-white/80">Today</div>
              <div className="text-base font-semibold text-white">{format(new Date(), 'dd MMM yyyy')}</div>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {/* KPI Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Classes KPI */}
          <div className="p-5 rounded-2xl bg-[#c8d9f5] border-t-[3px] border-t-[#444fd6] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">{totalClasses}</div>
                <div className="text-sm font-medium text-slate-600">Total Classes Enrolled</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#444fd6] flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Assignments Completed KPI */}
          <div className="p-5 rounded-2xl bg-[#c8f0dc] border-t-[3px] border-t-[#10b981] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">{assignmentsCompleted}</div>
                <div className="text-sm font-medium text-slate-600">Assignments Completed</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#10b981] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Assignments Pending KPI */}
          <div className="p-5 rounded-2xl bg-[#fde6c8] border-t-[3px] border-t-[#f59e0b] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">{assignmentsPending}</div>
                <div className="text-sm font-medium text-slate-600">Assignments Pending</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#f59e0b] flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Total Announcements KPI */}
          <div className="p-5 rounded-2xl bg-[#e3d4f0] border-t-[3px] border-t-[#8b5cf6] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {Object.values(announcements).reduce((acc, arr) => acc + arr.length, 0)}
                </div>
                <div className="text-sm font-medium text-slate-600">Total Announcements</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#8b5cf6] flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Calendar & Profile Row */}
        <div id="calendar-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Monthly Calendar */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#d0dffc] flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-[#444fd6]" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={goToPreviousMonth}
                  className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <button 
                  onClick={goToNextMonth}
                  className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Weekday headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                  {day}
                </div>
              ))}
              
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="min-h-[90px]"></div>
              ))}
              
              {/* Month days */}
              {monthDays.map((day) => {
                const isCurrentDay = isToday(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const dayNumber = format(day, 'd');
                const dayAssignments = getAssignmentsForDay(day);
                const hasAssignments = dayAssignments.length > 0;
                
                return (
                  <div
                    key={day.toString()}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[90px] p-2 rounded-lg cursor-pointer transition-all ${
                      isCurrentDay
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-sm'
                        : isSelected
                        ? 'bg-[#d0dffc] ring-2 ring-[#444fd6]'
                        : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isCurrentDay ? 'text-white' : 'text-slate-700'
                    }`}>
                      {dayNumber}
                      {hasAssignments && (
                        <span className={`ml-1 text-xs ${
                          isCurrentDay ? 'text-white' : 'text-[#444fd6] font-semibold'
                        }`}>
                          {dayAssignments.length}
                        </span>
                      )}
                    </div>
                    
                    {/* Assignment pills inside day cell */}
                    <div className="space-y-1">
                      {dayAssignments.slice(0, 2).map((assignment) => {
                        const colors = getColorForAssignment(assignment.id);
                        return (
                          <div
                            key={assignment.id}
                            className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${
                              isCurrentDay 
                                ? 'bg-white/90 text-[#387BFF] border-white/50' 
                                : `${colors.bg} ${colors.text} ${colors.border}`
                            }`}
                            title={assignment.title}
                          >
                            {assignment.title.slice(0, 15)}...
                          </div>
                        );
                      })}
                      {dayAssignments.length > 2 && (
                        <div className={`text-[10px] font-medium ${
                          isCurrentDay ? 'text-white' : 'text-slate-500'
                        }`}>
                          +{dayAssignments.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>            
            {/* Quick Stats Below Calendar */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-slate-600">Total Tasks</span>
                </div>
                <div className="text-xl font-bold text-blue-600">{allAssignments.length}</div>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-3 border border-emerald-100">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-medium text-slate-600">Completed</span>
                </div>
                <div className="text-xl font-bold text-emerald-600">{assignmentsCompleted}</div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-100">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium text-slate-600">Pending</span>
                </div>
                <div className="text-xl font-bold text-orange-600">{assignmentsPending}</div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-medium text-slate-600">Courses</span>
                </div>
                <div className="text-xl font-bold text-purple-600">{courses.length}</div>
              </div>
            </div>          </div>

          {/* Profile / Event Details Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col h-full shadow-sm">
            {!selectedDay ? (
              <>
                {/* Profile View */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-[#387BFF]" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">Profile</h2>
                </div>
                
                {/* Centered Profile Card */}
                <div className="flex flex-col items-center">
                  {/* Circular Avatar - medium size */}
                  <div className="w-22 h-22 rounded-full border-3 border-blue-200 overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md mb-3">
                    {session?.user?.image && !imageError ? (
                      <Image 
                        src={session.user.image} 
                        alt="Profile" 
                        width={88}
                        height={88}
                        className="w-full h-full object-cover"
                        unoptimized={true}
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-3xl">
                        {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  
                  {/* User Info - balanced */}
                  <div className="text-center mb-3 pb-2 border-b border-slate-100 w-full">
                    <div className="font-bold text-lg text-slate-800 mb-1">
                      {session?.user?.name || 'User'}
                    </div>
                    <div className="text-xs text-slate-500 mb-3">
                      {session?.user?.email || 'No email'}
                    </div>
                    
                    {/* View Analytics Button */}
                    <button
                      onClick={() => router.push('/analytics')}
                      className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 mt-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      View Analytics
                    </button>
                  </div>

                  {/* Stats List - Medium spacing */}
                  <div className="w-full space-y-1.5">
                    {/* Total Points */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-emerald-50 to-white hover:shadow-md transition-all duration-200 border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
                          <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">Total Points</span>
                      </div>
                      <span className="text-lg font-bold text-emerald-600">
                        {profileDataLoading ? '...' : totalPoints.toLocaleString()}
                      </span>
                    </div>

                    {/* Weekly Rank */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-purple-50 to-white hover:shadow-md transition-all duration-200 border border-purple-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-md">
                          <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">Weekly Rank</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600">
                        {profileDataLoading ? '...' : (weeklyRank ? `#${weeklyRank}` : '-')}
                      </span>
                    </div>

                    {/* Assignments Completed */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-orange-50 to-white hover:shadow-md transition-all duration-200 border border-orange-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-md">
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">Assignments Completed</span>
                      </div>
                      <span className="text-lg font-bold text-orange-600">{assignmentsCompleted}</span>
                    </div>

                    {/* Chapters Completed */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-cyan-50 to-white hover:shadow-md transition-all duration-200 border border-cyan-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-md">
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">Chapters Done</span>
                      </div>
                      <span className="text-lg font-bold text-cyan-600">
                        {profileDataLoading ? '...' : chaptersCompleted}
                      </span>
                    </div>

                    {/* Courses Completed */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-pink-50 to-white hover:shadow-md transition-all duration-200 border border-pink-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-md">
                          <Hand className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">Courses Completed</span>
                      </div>
                      <span className="text-lg font-bold text-pink-600">
                        {profileDataLoading ? '...' : coursesCompleted}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200">
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1">Today</div>
                    <div className="text-sm font-medium text-slate-700">{format(new Date(), 'EEEE, dd MMMM')}</div>
                  </div>
                </div>

                {/* Hint to select day */}
                <div className="mt-2 p-2 rounded-lg bg-[#d0dffc] border border-[#444fd6]/20">
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                    <CalendarIcon className="w-4 h-4 text-[#444fd6]" />
                    <p>Select a day from the calendar to view events</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Event Details View */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-[#d0dffc] flex items-center justify-center">
                      <CalendarIcon className="w-5 h-5 text-[#444fd6]" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800">Events</h2>
                  </div>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Selected Date Header */}
                <div className="mb-4 p-4 rounded-lg bg-[#d0dffc] border border-[#444fd6]/30">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarIcon className="w-4 h-4 text-[#444fd6]" />
                    <div className="text-xs text-slate-600 font-medium">Selected Date</div>
                  </div>
                  <div className="text-base font-semibold text-slate-800">
                    {format(selectedDay, 'EEEE, dd MMMM yyyy')}
                  </div>
                </div>

                {/* Events List */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                  {getAssignmentsForDay(selectedDay).length > 0 ? (
                    getAssignmentsForDay(selectedDay).map((assignment) => {
                      const colors = getColorForAssignment(assignment.id);
                      return (
                        <div
                          key={assignment.id}
                          className={`p-4 rounded-lg border ${colors.bg} ${colors.border} hover:translate-y-[-1px] transition-all`}
                        >
                          {/* Assignment Badge */}
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium mb-3 ${colors.badge}`}>
                            <ClipboardList className="w-3.5 h-3.5" />
                            Assignment
                          </div>

                          {/* Assignment Title */}
                          <div className="font-semibold text-base text-slate-800 mb-3">{assignment.title}</div>

                          {/* Subject/Class Information */}
                          <div className="mb-3 p-3 rounded-lg bg-white border border-slate-200">
                            <div className="flex items-center gap-2 mb-1">
                              <BookOpen className="w-4 h-4 text-slate-400" />
                              <span className="text-xs font-medium text-slate-500">Subject</span>
                            </div>
                            <div className="font-medium text-slate-800">{assignment.courseName}</div>
                            {assignment.courseSection && (
                              <div className="text-sm text-slate-600">Section: {assignment.courseSection}</div>
                            )}
                          </div>

                          {/* Due Date Information */}
                          <div className="mb-3 p-3 rounded-lg bg-white border border-slate-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <span className="text-xs font-medium text-slate-500">Due Date</span>
                            </div>
                            <div className="font-medium text-slate-800">
                              {format(selectedDay, 'EEEE, dd MMMM yyyy')}
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-amber-600 font-medium mt-1">
                              <Bell className="w-3.5 h-3.5" />
                              {isToday(selectedDay) ? 'Due Today!' : isSameDay(selectedDay, addDays(new Date(), 1)) ? 'Due Tomorrow!' : 'Upcoming'}
                            </div>
                          </div>

                          {/* Description */}
                          {assignment.description && (
                            <div className="mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <ClipboardList className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-medium text-slate-500">Description</span>
                              </div>
                              <div 
                                className="text-sm text-slate-700 leading-relaxed text-justify bg-white p-3 rounded-lg border border-slate-200 overflow-hidden"
                                style={{ 
                                  wordWrap: 'break-word',
                                  overflowWrap: 'anywhere',
                                  whiteSpace: 'pre-wrap'
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: assignment.description.replace(
                                    /(https?:\/\/[^\s]+)/g,
                                    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all">$1</a>'
                                  )
                                }}
                              />
                            </div>
                          )}

                          {/* Status Badge */}
                          <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#fef5e7] text-amber-600 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Pending
                            </div>
                            <div className="ml-auto text-xs text-slate-400">
                              ID: {assignment.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-14 h-14 rounded-xl bg-slate-100 mx-auto mb-3 flex items-center justify-center">
                        <CalendarIcon className="w-7 h-7 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500">No events on this day</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Classes, Announcements, and Assignments Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Classes Container */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#c8f0dc] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#10b981]" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Your Classes</h2>
            </div>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {courses.length > 0 ? (
                courses.map((course) => (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCourseId(course.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedCourseId === course.id
                        ? 'bg-[#c8f0dc] border-2 border-[#10b981]'
                        : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                    }`}
                  >
                    <div className={`font-medium mb-1 ${
                      selectedCourseId === course.id ? 'text-[#10b981]' : 'text-slate-800'
                    }`}>
                      {course.name}
                    </div>
                    <div className="text-sm text-slate-500">
                      {course.section || 'No section'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No classes found</p>
                </div>
              )}
            </div>
          </div>

          {/* Announcements Container */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#f5d0e0] flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-[#ec4899]" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Announcements</h2>
            </div>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {announcements[selectedCourseId || ""]?.length > 0 ? (
                announcements[selectedCourseId || ""].map((a) => (
                  <div key={a.id} className="pl-2 pr-3 py-3 rounded-lg bg-[#f5d0e0] border border-[#ec4899]/30 hover:bg-[#f0b8d5] transition-colors">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Megaphone className="w-3.5 h-3.5 text-[#ec4899]" />
                      </div>
                      <div 
                        className="text-sm text-slate-700 leading-relaxed text-justify flex-1 overflow-hidden"
                        style={{ 
                          wordWrap: 'break-word',
                          overflowWrap: 'anywhere',
                          whiteSpace: 'pre-wrap'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: a.text.replace(
                            /(https?:\/\/[^\s]+)/g,
                            '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all">$1</a>'
                          )
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No announcements yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Assignments Container */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#e3d4f0] flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-[#8b5cf6]" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Assignments</h2>
            </div>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {assignments[selectedCourseId || ""]?.length > 0 ? (
                assignments[selectedCourseId || ""].map((assignment) => (
                  <div key={assignment.id} className="pl-2 pr-3 py-3 rounded-lg bg-[#e3d4f0] border border-[#8b5cf6]/30 hover:bg-[#d6bfe8] transition-colors">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <ClipboardList className="w-3.5 h-3.5 text-[#8b5cf6]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 mb-1 overflow-hidden" style={{ wordWrap: 'break-word', overflowWrap: 'anywhere' }}>
                          {assignment.title}
                        </div>
                        {assignment.description && (
                          <div 
                            className="text-sm text-slate-600 leading-relaxed text-justify overflow-hidden"
                            style={{ 
                              wordWrap: 'break-word',
                              overflowWrap: 'anywhere',
                              whiteSpace: 'pre-wrap'
                            }}
                            dangerouslySetInnerHTML={{
                              __html: assignment.description.replace(
                                /(https?:\/\/[^\s]+)/g,
                                '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all">$1</a>'
                              )
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No assignments yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
