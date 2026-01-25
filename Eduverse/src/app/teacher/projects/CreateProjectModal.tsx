"use client";
import { useState } from "react";
import { X, Plus, Trash2, Info } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  description: string;
  max_marks: number;
  sequence_order: number;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teacherEmail: string;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
  teacherEmail,
}: CreateProjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Project form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalMarks, setTotalMarks] = useState(100);

  // Milestones state
  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      id: "1",
      title: "",
      description: "",
      max_marks: 0,
      sequence_order: 1,
    },
  ]);

  const addMilestone = () => {
    const newId = (milestones.length + 1).toString();
    setMilestones([
      ...milestones,
      {
        id: newId,
        title: "",
        description: "",
        max_marks: 0,
        sequence_order: milestones.length + 1,
      },
    ]);
  };

  const removeMilestone = (id: string) => {
    if (milestones.length > 1) {
      const updated = milestones
        .filter((m) => m.id !== id)
        .map((m, idx) => ({ ...m, sequence_order: idx + 1 }));
      setMilestones(updated);
    }
  };

  const updateMilestone = (id: string, field: keyof Milestone, value: string | number) => {
    setMilestones(
      milestones.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      )
    );
  };

  const getTotalMilestoneMarks = () => {
    return milestones.reduce((sum, m) => sum + (Number(m.max_marks) || 0), 0);
  };

  const validateForm = () => {
    if (!title.trim()) return "Project title is required";
    if (milestones.length === 0) return "At least one milestone is required";
    
    const milestoneMarks = getTotalMilestoneMarks();
    if (milestoneMarks > totalMarks) {
      return `Milestone marks (${milestoneMarks}) exceed total marks (${totalMarks})`;
    }

    for (const milestone of milestones) {
      if (!milestone.title.trim()) return "All milestones must have a title";
      if (milestone.max_marks <= 0) return "All milestones must have marks greater than 0";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_email: teacherEmail,
          title,
          description,
          total_marks: totalMarks,
          milestones: milestones.map((m) => ({
            title: m.title,
            description: m.description,
            max_marks: m.max_marks,
            sequence_order: m.sequence_order,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      // Reset form
      setTitle("");
      setDescription("");
      setTotalMarks(100);
      setMilestones([
        {
          id: "1",
          title: "",
          description: "",
          max_marks: 0,
          sequence_order: 1,
        },
      ]);

      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const milestoneMarks = getTotalMilestoneMarks();
  const marksRemaining = totalMarks - milestoneMarks;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create New Project</h2>
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
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Project Title */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Project Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., E-Commerce Website Development"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#387BFF] focus:border-transparent"
              disabled={loading}
              required
            />
          </div>

          {/* Project Description */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the project goals and requirements..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#387BFF] focus:border-transparent resize-none"
              disabled={loading}
            />
          </div>

          {/* Total Marks */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Total Marks <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={totalMarks}
              onChange={(e) => setTotalMarks(Number(e.target.value))}
              min="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#387BFF] focus:border-transparent"
              disabled={loading}
              required
            />
          </div>

          {/* Marks Summary */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Milestone Marks Total:</span>
              <span
                className={`font-bold ${
                  milestoneMarks > totalMarks
                    ? "text-red-600"
                    : milestoneMarks === totalMarks
                    ? "text-green-600"
                    : "text-blue-900"
                }`}
              >
                {milestoneMarks} / {totalMarks}
              </span>
            </div>
            {marksRemaining !== 0 && (
              <div className="mt-2 text-xs text-gray-600">
                {marksRemaining > 0
                  ? `${marksRemaining} marks remaining`
                  : `${Math.abs(marksRemaining)} marks over limit`}
              </div>
            )}
          </div>

          {/* Milestones Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-semibold text-gray-700">
                Milestones <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addMilestone}
                className="px-3 py-1.5 bg-[#387BFF] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                disabled={loading}
              >
                <Plus className="w-4 h-4" />
                Add Milestone
              </button>
            </div>

            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-bold text-gray-700">
                      Milestone {index + 1}
                    </span>
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(milestone.id)}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Milestone Title */}
                    <input
                      type="text"
                      value={milestone.title}
                      onChange={(e) =>
                        updateMilestone(milestone.id, "title", e.target.value)
                      }
                      placeholder="Milestone title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#387BFF] focus:border-transparent"
                      disabled={loading}
                      required
                    />

                    {/* Milestone Description */}
                    <textarea
                      value={milestone.description}
                      onChange={(e) =>
                        updateMilestone(milestone.id, "description", e.target.value)
                      }
                      placeholder="Milestone description"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#387BFF] focus:border-transparent resize-none"
                      disabled={loading}
                    />

                    {/* Max Marks */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 min-w-[80px]">
                        Max Marks:
                      </label>
                      <input
                        type="number"
                        value={milestone.max_marks}
                        onChange={(e) =>
                          updateMilestone(
                            milestone.id,
                            "max_marks",
                            Number(e.target.value)
                          )
                        }
                        min="1"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#387BFF] focus:border-transparent"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
