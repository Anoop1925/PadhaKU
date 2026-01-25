"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, Video, CheckCircle, MoreVertical, Trophy, Play, Lock } from "lucide-react";
import { Course, Subtopic } from "@/types/feature-2";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChapterProgress {
  chapter_index: number;
  is_completed: boolean;
  chapter_score: number;
}

// Helper function to convert YouTube URL to embed format
function getYouTubeEmbedUrl(url: string): string {
  if (!url) return "";
  
  // Extract video ID from various YouTube URL formats
  let videoId = "";
  
  // Format: https://www.youtube.com/watch?v=VIDEO_ID
  if (url.includes("youtube.com/watch?v=")) {
    videoId = url.split("watch?v=")[1].split("&")[0];
  }
  // Format: https://youtu.be/VIDEO_ID
  else if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1].split("?")[0];
  }
  // Format: https://www.youtube.com/embed/VIDEO_ID (already embed)
  else if (url.includes("youtube.com/embed/")) {
    return url;
  }
  
  // Return embed URL
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

function TopicReelModal({ open, onClose, subtopics, initialIndex }: { open: boolean; onClose: () => void; subtopics: Subtopic[]; initialIndex: number }) {
  const [index, setIndex] = useState(initialIndex);
  if (!open || !subtopics || subtopics.length === 0) return null;
  const subtopic = subtopics[index];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative">
        <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors z-10 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md text-2xl" onClick={onClose} title="Close">
          ×
        </button>
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="text-xs text-gray-500 mb-2">{index + 1} / {subtopics.length}</div>
          <h2 className="text-2xl font-semibold text-blue-700 mb-4 flex items-center gap-2 text-left">
            <BookOpen size={24} /> {subtopic.title}
          </h2>
          <div className="space-y-4 text-gray-700 text-left">
            <p><span className="font-medium">Theory:</span> {subtopic.theory}</p>
            <p><span className="font-medium">Example:</span> {subtopic.example}</p>
            <p><span className="font-medium">Hands-on:</span> {subtopic.handsOn}</p>
            {subtopic.videoUrl && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Video size={20} className="text-red-600" /> 
                  <span className="font-semibold text-gray-800">Video Tutorial</span>
                </div>
                
                {/* YouTube Video Embed */}
                <div className="relative w-full mb-3 rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    className="absolute top-0 left-0 w-full h-full border-2 border-gray-200"
                    src={getYouTubeEmbedUrl(subtopic.videoUrl)}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* Helpful Message */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-blue-800 flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>
                      <strong>Can't see the video?</strong> Some videos can't be displayed here due to creator restrictions. No worries! Click the button below to watch it directly on YouTube. 🎥
                    </span>
                  </p>
                </div>

                {/* Fallback Button */}
                <a
                  href={subtopic.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-xl transform hover:scale-105"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Watch on YouTube
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>
        
        {/* Fixed Footer with Navigation Buttons */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50 rounded-b-xl flex-shrink-0">
          <button
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            title="Previous"
          >
            Previous
          </button>
          <button
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setIndex((i) => Math.min(subtopics.length - 1, i + 1))}
            disabled={index === subtopics.length - 1}
            title="Next"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CourseDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [course, setCourse] = useState<Course | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [activeSubtopic, setActiveSubtopic] = useState<{ subtopics: Subtopic[]; index: number } | null>(null);
  const [completedChapters, setCompletedChapters] = useState<Set<number>>(new Set());
  const [chapterScores, setChapterScores] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchCourse() {
      setLoading(true);
      const res = await fetch(`/api/feature-2/courses?cid=${id}`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
      } else {
        setError("Course not found");
      }
      setLoading(false);
    }
    if (id) fetchCourse();
  }, [id]);

  // Fetch user progress for this course
  useEffect(() => {
    async function fetchProgress() {
      if (!course?.id || !session?.user?.email) return;
      
      try {
        const res = await fetch(`/api/quiz/submit?courseId=${course.id}`);
        if (res.ok) {
          const data = await res.json();
          const completed = new Set<number>();
          const scores = new Map<number, number>();
          
          (data.progress || []).forEach((p: ChapterProgress) => {
            if (p.is_completed) {
              completed.add(p.chapter_index);
              scores.set(p.chapter_index, p.chapter_score);
            }
          });
          
          setCompletedChapters(completed);
          setChapterScores(scores);
        }
      } catch (err) {
        console.error("Failed to fetch progress:", err);
      }
    }
    
    fetchProgress();
  }, [course?.id, session?.user?.email]);

  const handleToggle = (idx: number) => {
    setExpanded(expanded === idx ? null : idx);
  };

  const handleDelete = async () => {
    if (!course) return;
    setDeleting(true);
    await fetch("/api/feature-2/courses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cid: course.cid }),
    });
    setDeleting(false);
    router.push("/feature-2");
  };

  if (loading) return <div className="p-10 text-center text-gray-700 animate-pulse">Loading course...</div>;
  if (error || !course) return <div className="p-10 text-center text-red-600">{error || "Course not found"}</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-sm rounded-lg min-h-screen">
      {/* Header Section */}
      <div className="flex items-center gap-6 mb-10 bg-gray-50 p-6 rounded-lg shadow-md">
        <div className="w-32 h-32 relative">
          {course.bannerImageUrl ? (
            <Image src={course.bannerImageUrl} alt={`${course.name} course banner`} fill unoptimized className="rounded-lg object-cover border" />
          ) : course.bannerImagePrompt && (/^(https?:\/\/|\/)/.test(course.bannerImagePrompt) ? (
            <Image src={course.bannerImagePrompt} alt={`${course.name} course banner`} fill unoptimized className="rounded-lg object-cover border" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-lg border text-gray-500">
              <BookOpen size={32} />
            </div>
          ))}
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-blue-700 mb-2">{course.name}</h1>
          <p className="text-gray-600 text-sm mb-2 line-clamp-2">{course.description}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Category: {course.category}</span>
            <span>Level: {course.level}</span>
            <span className="flex items-center gap-1"><BookOpen size={16} /> {course.noOfChapters} Chapters</span>
          </div>
        </div>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors" title="More options">
              <MoreVertical size={20} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-32 bg-white border border-gray-200 rounded-md shadow-lg">
            <DropdownMenuItem onClick={handleDelete} className="text-red-600 hover:bg-red-50 cursor-pointer">
              {deleting ? "Deleting..." : "Delete"}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-yellow-600 hover:bg-yellow-50 cursor-pointer">
              Star
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Gamified Roadmap */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-blue-700 mb-6 flex items-center gap-2" style={{ paddingLeft: '10px' }}>
          <BookOpen size={24} /> &nbsp;Your Learning Journey
        </h2>
        <div className="space-y-6">
          {course.chapters.map((ch, idx) => (
            <div key={idx} className={`bg-white p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 ${completedChapters.has(idx) ? "ring-2 ring-green-400" : "border border-gray-200"}`}>
              {/* Chapter Header */}
              <div
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => handleToggle(idx)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full font-semibold text-lg ${completedChapters.has(idx) ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{ch.chapterName}</h3>
                      {completedChapters.has(idx) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          <Trophy size={12} />
                          {chapterScores.get(idx) || 0}/10
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">Duration: {ch.duration}</p>
                  </div>
                </div>
                
                {/* Completion Icon */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${completedChapters.has(idx) ? "bg-green-500 text-white scale-110" : "bg-gray-100 text-gray-400"}`}>
                  <CheckCircle size={24} />
                </div>
              </div>

              {/* Expanded Subtopics Section */}
              {expanded === idx && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <BookOpen size={16} />
                    Subtopics:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {ch.subtopics.map((subtopic, i) => (
                      <button
                        key={i}
                        className="px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-200 rounded-lg shadow-sm hover:shadow-md text-sm text-gray-800 font-medium transition-all duration-200 text-left flex items-center gap-2 group"
                        onClick={() => setActiveSubtopic({ subtopics: ch.subtopics, index: i })}
                      >
                        <Video size={16} className="text-blue-600 group-hover:scale-110 transition-transform" />
                        <span className="flex-1">{subtopic.title}</span>
                      </button>
                    ))}
                  </div>
                  
                  {/* Quiz Button */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {completedChapters.has(idx) ? (
                      <div className="flex items-center gap-3 px-6 py-3 bg-green-100 rounded-lg">
                        <Trophy className="text-green-600" size={20} />
                        <div>
                          <p className="font-semibold text-green-700">Quiz Completed!</p>
                          <p className="text-sm text-green-600">Score: {chapterScores.get(idx) || 0}/10 points</p>
                        </div>
                      </div>
                    ) : idx === 0 || completedChapters.has(idx - 1) ? (
                      <button
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Use cid for URL navigation (cid is the public URL identifier)
                          router.push(`/course/${course.cid}/chapter/${idx}/quiz`);
                        }}
                      >
                        <Play size={18} />
                        Take Quiz
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 px-6 py-3 bg-gray-100 rounded-lg border border-gray-200">
                        <Lock className="text-gray-400" size={20} />
                        <div>
                          <p className="font-semibold text-gray-500">Quiz Locked</p>
                          <p className="text-sm text-gray-400">Complete Chapter {idx} first</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {activeSubtopic && (
            <TopicReelModal
              open={!!activeSubtopic}
              onClose={() => setActiveSubtopic(null)}
              subtopics={activeSubtopic.subtopics}
              initialIndex={activeSubtopic.index}
            />
          )}
        </div>
      </div>
    </div>
  );
}