'use client';

import { useState } from 'react';
import { X, Plus, Loader2, AlertCircle, Calendar, Clock, Award, Link as LinkIcon, Youtube, FileText, Trash2, Upload } from 'lucide-react';

interface Material {
  type: 'youtubeVideo' | 'link' | 'driveFile' | 'form';
  youtubeVideo?: { id: string; title?: string; thumbnailUrl?: string };
  link?: { url: string; title?: string; thumbnailUrl?: string };
  driveFile?: { driveFile: { id: string; title?: string; thumbnailUrl?: string; alternateLink?: string } };
  form?: { formUrl: string; title?: string; thumbnailUrl?: string };
}

interface Topic {
  courseId: string;
  topicId: string;
  name: string;
  updateTime: string;
}

interface CreateAssignmentModalProps {
  classroomId: string;
  topics: Topic[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateAssignmentModal({ classroomId, topics, onClose, onSuccess }: CreateAssignmentModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');

  // Set minimum date to tomorrow
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };
  const [maxPoints, setMaxPoints] = useState('100');
  const [workType, setWorkType] = useState('ASSIGNMENT');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [materialType, setMaterialType] = useState<'youtubeVideo' | 'link' | 'form' | 'driveFile'>('link');
  const [materialUrl, setMaterialUrl] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\?\s]+)/,
      /youtube\.com\/embed\/([^&\?\s]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const extractDriveFileId = (url: string): string | null => {
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /\/open\?id=([a-zA-Z0-9_-]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleAddMaterial = () => {
    if (!materialUrl.trim()) return;

    const newMaterial: Material = { type: materialType };

    if (materialType === 'youtubeVideo') {
      const videoId = extractYouTubeId(materialUrl);
      if (!videoId) {
        setError('Invalid YouTube URL');
        return;
      }
      newMaterial.youtubeVideo = {
        id: videoId,
        title: materialTitle.trim() || undefined,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/default.jpg`,
      };
    } else if (materialType === 'link') {
      newMaterial.link = {
        url: materialUrl.trim(),
        title: materialTitle.trim() || materialUrl.trim(),
      };
    } else if (materialType === 'form') {
      newMaterial.form = {
        formUrl: materialUrl.trim(),
        title: materialTitle.trim() || 'Google Form',
      };
    } else if (materialType === 'driveFile') {
      const fileId = extractDriveFileId(materialUrl);
      if (!fileId) {
        setError('Invalid Google Drive URL. Please use sharing link from Drive.');
        return;
      }
      newMaterial.driveFile = {
        driveFile: {
          id: fileId,
          title: materialTitle.trim() || 'Drive File',
          alternateLink: materialUrl.trim(),
        }
      };
    }

    setMaterials([...materials, newMaterial]);
    setMaterialUrl('');
    setMaterialTitle('');
    setShowAddMaterial(false);
    setError(null);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Please enter assignment title');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convert materials to Google Classroom API format (remove 'type' field)
      const formattedMaterials = materials.map(material => {
        const { type, ...rest } = material;
        return rest;
      });

      const requestBody: any = {
        title: title.trim(),
        description: description.trim(),
        maxPoints: parseInt(maxPoints) || 100,
        workType,
        materials: formattedMaterials.length > 0 ? formattedMaterials : undefined,
      };

      if (dueDate) {
        requestBody.dueDate = `${dueDate}T${dueTime}:00`;
      }

      const response = await fetch(`/api/teacher/classrooms/${classroomId}/coursework`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create assignment');
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating assignment:', error);
      setError(error instanceof Error ? error.message : 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full my-8 shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 rounded-t-3xl">
          <h2 className="text-2xl font-bold text-slate-800">Create Assignment</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex flex-col gap-2 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
              {(error.includes('permission') || error.includes('teacher access') || error.includes('Due date')) && (
                <div className="ml-8">
                  {(error.includes('permission') || error.includes('teacher access')) && (
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = '/api/auth/signout?callbackUrl=/sign-in';
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 underline font-medium"
                    >
                      Sign out and sign in again to update permissions
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Assignment Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chapter 5 Homework"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-800 placeholder-slate-400"
              disabled={loading}
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Instructions
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed instructions for students..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-slate-800 placeholder-slate-400"
              disabled={loading}
              maxLength={3000}
            />
          </div>

          {/* Due Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={getTomorrowDate()}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-800"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Due Time
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-800"
                disabled={loading}
              />
            </div>
          </div>

          {/* Points and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Points
              </label>
              <input
                type="number"
                value={maxPoints}
                onChange={(e) => setMaxPoints(e.target.value)}
                min="0"
                max="1000"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-800"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Assignment Type
              </label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-800"
                disabled={loading}
              >
                <option value="ASSIGNMENT">Assignment</option>
                <option value="SHORT_ANSWER_QUESTION">Short Answer</option>
                <option value="MULTIPLE_CHOICE_QUESTION">Multiple Choice</option>
              </select>
            </div>
          </div>

          {/* Materials Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">
                Attachments (Optional)
              </label>
              {!showAddMaterial && (
                <button
                  type="button"
                  onClick={() => setShowAddMaterial(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  disabled={loading}
                >
                  <Plus className="w-4 h-4" />
                  Add Material
                </button>
              )}
            </div>

            {/* Existing Materials */}
            {materials.length > 0 && (
              <div className="space-y-2">
                {materials.map((material, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    {material.type === 'youtubeVideo' && (
                      <>
                        <Youtube className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {material.youtubeVideo?.title || 'YouTube Video'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            youtube.com/watch?v={material.youtubeVideo?.id}
                          </p>
                        </div>
                      </>
                    )}
                    {material.type === 'link' && (
                      <>
                        <LinkIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {material.link?.title}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {material.link?.url}
                          </p>
                        </div>
                      </>
                    )}
                    {material.type === 'driveFile' && (
                      <>
                        <FileText className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {material.driveFile?.driveFile?.title || 'Drive File'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            Google Drive
                          </p>
                        </div>
                      </>
                    )}
                    {material.type === 'form' && (
                      <>
                        <FileText className="w-5 h-5 text-purple-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {material.form?.title}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            Google Form
                          </p>
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(index)}
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors flex-shrink-0"
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Material Form */}
            {showAddMaterial && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Material Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMaterialType('link')}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        materialType === 'link'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <LinkIcon className="w-4 h-4 inline mr-1.5" />
                      Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaterialType('youtubeVideo')}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        materialType === 'youtubeVideo'
                          ? 'bg-red-600 text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Youtube className="w-4 h-4 inline mr-1.5" />
                      YouTube
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaterialType('driveFile')}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        materialType === 'driveFile'
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Upload className="w-4 h-4 inline mr-1.5" />
                      Drive File
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaterialType('form')}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        materialType === 'form'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <FileText className="w-4 h-4 inline mr-1.5" />
                      Form
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {materialType === 'youtubeVideo' ? 'YouTube URL' : 
                     materialType === 'driveFile' ? 'Google Drive Link' :
                     materialType === 'form' ? 'Google Form URL' : 'Link URL'}
                  </label>
                  {materialType === 'driveFile' ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={materialUrl}
                          onChange={(e) => setMaterialUrl(e.target.value)}
                          placeholder="https://drive.google.com/file/d/..."
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => window.open('https://drive.google.com/drive/my-drive', '_blank')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Browse Drive
                        </button>
                      </div>
                      <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded border border-blue-200">
                        <p className="font-medium mb-1">📂 How to add Drive files:</p>
                        <ol className="list-decimal list-inside space-y-0.5 ml-2">
                          <li>Click "Browse Drive" to open Google Drive</li>
                          <li>Upload or find your file (PDF, PPT, DOC, etc.)</li>
                          <li>Right-click → Share → Copy link</li>
                          <li>Paste the link in the field above</li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <input
                      type="url"
                      value={materialUrl}
                      onChange={(e) => setMaterialUrl(e.target.value)}
                      placeholder={
                        materialType === 'youtubeVideo' ? 'https://youtube.com/watch?v=...' : 'https://...'
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                    placeholder="Custom title for this material"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMaterial(false);
                      setMaterialUrl('');
                      setMaterialTitle('');
                      setError(null);
                    }}
                    className="flex-1 px-3 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMaterial}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Add Material
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-semibold"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading || !title.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Assignment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
