'use client';

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { 
  Plus, 
  Users, 
  BookOpen, 
  MoreVertical,
  Search,
  Loader2,
  AlertCircle,
  Copy,
  ExternalLink
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Classroom {
  id: string;
  name: string;
  section: string;
  enrollmentCode: string;
  studentCount: number;
  alternateLink: string;
  color: string;
}

export default function ClassroomsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Crayonish colors for classroom cards
  const colors = [
    "from-red-400 to-pink-500",
    "from-yellow-400 to-orange-500",
    "from-green-400 to-emerald-500",
    "from-blue-400 to-cyan-500",
    "from-purple-400 to-indigo-500",
    "from-pink-400 to-rose-500",
    "from-teal-400 to-green-500",
    "from-orange-400 to-red-500",
  ];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
      return;
    }

    if (status === 'authenticated') {
      fetchClassrooms();
    }
  }, [status, router]);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[Classrooms Page] Fetching classrooms...');

      const response = await fetch('/api/teacher/classrooms');
      
      console.log('[Classrooms Page] Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Classrooms Page] Error response:', errorData);
        
        if (response.status === 401) {
          throw new Error('Your session has expired. Please sign out and sign in again to continue.');
        }
        
        throw new Error(errorData.error || 'Failed to fetch classrooms');
      }

      const data = await response.json();
      
      console.log('[Classrooms Page] Fetched', data.courses?.length || 0, 'classrooms');
      
      // Assign colors to classrooms
      const classroomsWithColors = data.courses.map((course: any, index: number) => ({
        ...course,
        color: colors[index % colors.length],
      }));
      
      setClassrooms(classroomsWithColors);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      setError(error instanceof Error ? error.message : 'Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  };

  const filteredClassrooms = classrooms.filter(classroom =>
    classroom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    classroom.section.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyEnrollmentCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    // Could add a toast notification here
  };

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafbfc]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading classrooms...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const isAuthError = error.includes('session') || error.includes('expired') || error.includes('Unauthorized');
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafbfc]">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Failed to Load Classrooms</h2>
          <p className="text-slate-600 mb-6 text-lg">{error}</p>
          <div className="flex gap-3 justify-center">
            {isAuthError ? (
              <button
                onClick={() => signOut({ callbackUrl: '/sign-in' })}
                className="px-8 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl hover:from-red-600 hover:to-orange-600 transition-all font-semibold shadow-lg"
              >
                Sign Out & Sign In Again
              </button>
            ) : (
              <button
                onClick={fetchClassrooms}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all font-semibold shadow-lg"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 bg-[#fafbfc] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            My Classrooms
          </h1>
          <p className="text-sm text-slate-600">
            Manage all your classes in one place
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg font-semibold text-sm"
        >
          <Plus className="w-4 h-4" />
          Create Classroom
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search classrooms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Classrooms Grid */}
      {filteredClassrooms.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            No classrooms found
          </h3>
          <p className="text-slate-600 mb-6">
            {searchQuery ? "Try adjusting your search" : "Create your first classroom to get started"}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg font-semibold"
            >
              <Plus className="w-5 h-5" />
              Create Classroom
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClassrooms.map((classroom, index) => (
            <div
              key={classroom.id}
              onClick={() => router.push(`/teacher/classrooms/${classroom.id}`)}
              className="group cursor-pointer bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-slate-200 hover:border-blue-200 hover:scale-[1.02]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Colorful Header with Pattern */}
              <div className={`h-24 bg-gradient-to-br ${classroom.color} relative overflow-hidden`}>
                {/* Decorative Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -translate-y-10 translate-x-10"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-white rounded-full translate-y-8 -translate-x-8"></div>
                </div>
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                
                {/* Action Buttons */}
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(classroom.alternateLink, '_blank');
                    }}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all hover:scale-105 shadow-sm"
                    title="Open in Google Classroom"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                
                {/* Course Info */}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-base font-bold text-white mb-0.5 drop-shadow-md line-clamp-1">
                    {classroom.name}
                  </h3>
                  <p className="text-white/90 text-xs font-medium drop-shadow">
                    {classroom.section || 'No section'}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-3 space-y-2.5">
                {/* Enrollment Code */}
                {classroom.enrollmentCode && (
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-2.5 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                          Class Code
                        </span>
                        <div className="font-mono font-bold text-blue-600 text-base tracking-wide mt-0.5">
                          {classroom.enrollmentCode}
                        </div>
                      </div>
                      <button
                        onClick={(e) => copyEnrollmentCode(classroom.enrollmentCode, e)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-all hover:scale-105 group/copy"
                        title="Copy code"
                      >
                        <Copy className="w-4 h-4 text-blue-600 group-hover/copy:text-blue-700" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg flex-1">
                    <div className="p-1.5 bg-blue-100 rounded-md">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-medium">Students</div>
                      <div className="text-base font-bold text-slate-800">{classroom.studentCount}</div>
                    </div>
                  </div>
                </div>

                {/* View Classroom Button */}
                <div className="pt-1">
                  <div className="flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-semibold text-xs group-hover:from-blue-600 group-hover:to-indigo-600 transition-all shadow-sm group-hover:shadow-md">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open Classroom</span>
                  </div>
                </div>
              </div>

              {/* Bottom Accent */}
              <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          ))}
        </div>
      )}

      {/* Create Classroom Modal */}
      {showCreateModal && (
        <CreateClassroomModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchClassrooms();
          }}
        />
      )}
    </div>
  );
}

function CreateClassroomModal({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    section: "",
    description: "",
    room: "",
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError('Class name is required');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/teacher/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to create classroom');
      }

      // Check if manual activation is required
      if (data.requiresManualActivation && data.activationUrl) {
        setSuccess('Course created! Opening Google Classroom to activate...');
        
        // Open Google Classroom in new tab
        window.open(data.activationUrl, '_blank');
        
        // Show instruction message
        setTimeout(() => {
          setSuccess('Please activate the course in the opened tab, then this page will refresh automatically.');
        }, 2000);
        
        // Auto-refresh after 8 seconds to show the new course
        setTimeout(() => {
          onSuccess();
        }, 8000);
        
        return;
      }

      // Show success message
      setSuccess(data.message || 'Classroom created successfully!');
      
      // If it requires activation, show that info too
      if (data.requiresActivation) {
        setSuccess('Classroom created! Note: It was automatically activated and is ready to use.');
      }
      
      // Close modal and refresh after 2 seconds
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      console.error('Error creating classroom:', error);
      setError(error instanceof Error ? error.message : 'Failed to create classroom');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          Create New Classroom
        </h2>

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-green-700 text-sm font-medium">{success}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-600 text-sm font-medium mb-1">Failed to create classroom</p>
                <p className="text-red-700 text-xs leading-relaxed">{error}</p>
                {error.includes('Google Workspace') && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs text-red-600 font-medium mb-1">Alternative:</p>
                    <p className="text-xs text-red-700">
                      Create the course directly in{' '}
                      <a 
                        href="https://classroom.google.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:text-red-800"
                      >
                        Google Classroom
                      </a>
                      , and it will automatically appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Class Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Mathematics"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Section
            </label>
            <input
              type="text"
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              placeholder="e.g., 10A"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the class"
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Room (optional)
            </label>
            <input
              type="text"
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              placeholder="e.g., Room 101"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={creating}
            className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Classroom'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
