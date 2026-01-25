"use client";
import { useState, useEffect } from "react";
import { X, Users, Search, Loader2 } from "lucide-react";

interface Student {
  email: string;
  display_name: string;
  user_points: number;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: number;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
}: CreateGroupModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState("");
  const [groupName, setGroupName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen]);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/students?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStudent = (email: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedStudents(newSelected);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }

    if (selectedStudents.size === 0) {
      setError("Please select at least one student");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          group_name: groupName,
          student_emails: Array.from(selectedStudents),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create group");
      }

      // Reset form
      setGroupName("");
      setSelectedStudents(new Set());
      setSearchQuery("");

      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create Group</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Group Name */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Team Alpha, Group 1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#387BFF] focus:border-transparent"
              disabled={loading}
              required
            />
          </div>

          {/* Student Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Students <span className="text-red-500">*</span>
            </label>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#387BFF] focus:border-transparent"
              />
            </div>

            {/* Selected Count */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedStudents.size} student{selectedStudents.size !== 1 ? "s" : ""} selected
              </span>
              {selectedStudents.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedStudents(new Set())}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Students List */}
            {loadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#387BFF]" />
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg max-h-80 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? "No students found" : "No students available"}
                  </div>
                ) : (
                  filteredStudents.map((student) => (
                    <label
                      key={student.email}
                      className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.email)}
                        onChange={() => toggleStudent(student.email)}
                        className="w-4 h-4 text-[#387BFF] border-gray-300 rounded focus:ring-[#387BFF]"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{student.display_name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Points</div>
                        <div className="text-sm font-bold text-[#387BFF]">
                          {student.user_points || 0}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-[#387BFF] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || loadingStudents}
            >
              {loading ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
