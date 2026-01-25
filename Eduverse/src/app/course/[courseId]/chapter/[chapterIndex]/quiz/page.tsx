"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Trophy, Star, Loader2, RotateCcw, Home } from "lucide-react";
import Image from "next/image";

interface Question {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

interface QuizData {
  questions: Question[];
}

const OPTION_STYLES = [
  { bg: "from-rose-400 to-rose-500", border: "border-rose-200", shadow: "shadow-rose-300/50" },
  { bg: "from-sky-400 to-sky-500", border: "border-sky-200", shadow: "shadow-sky-300/50" },
  { bg: "from-emerald-400 to-emerald-500", border: "border-emerald-200", shadow: "shadow-emerald-300/50" },
  { bg: "from-violet-400 to-violet-500", border: "border-violet-200", shadow: "shadow-violet-300/50" },
];

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  // URL param could be either cid (string) or id (number) - we treat it as cid for lookup
  const courseIdParam = params.courseId as string;
  const chapterIndex = parseInt(params.chapterIndex as string);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [chapterName, setChapterName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCid, setCourseCid] = useState<string>(courseIdParam); // Track cid for navigation
  const [courseDbId, setCourseDbId] = useState<number | null>(null); // Track DB id for API calls

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [chapterLocked, setChapterLocked] = useState(false);

  // Logic: Check Completion and Chapter Lock - use cid parameter
  useEffect(() => {
    async function checkCompletionAndLock() {
      if (!session?.user?.email) return;
      try {
        // Check if current chapter is already completed
        const res = await fetch(`/api/quiz/submit?cid=${courseIdParam}&chapterIndex=${chapterIndex}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isCompleted) {
            setAlreadyCompleted(true);
            setLoading(false);
            return;
          }
        }

        // Check if previous chapter is completed (for chapters > 0)
        if (chapterIndex > 0) {
          const prevRes = await fetch(`/api/quiz/submit?cid=${courseIdParam}&chapterIndex=${chapterIndex - 1}`);
          if (prevRes.ok) {
            const prevData = await prevRes.json();
            if (!prevData.isCompleted) {
              setChapterLocked(true);
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Failed to check completion:", err);
      }
    }
    if (status === "authenticated") checkCompletionAndLock();
  }, [session, courseIdParam, chapterIndex, status]);

  // Logic: Generate Quiz - use cid parameter
  useEffect(() => {
    async function generateQuiz() {
      if (alreadyCompleted || chapterLocked) return;
      try {
        const res = await fetch("/api/quiz/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cid: courseIdParam, chapterIndex }),
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setQuizData(data.quiz);
          setChapterName(data.chapterName);
          setCourseName(data.courseName);
          setCourseCid(data.cid || courseIdParam); // Store cid for navigation
          setCourseDbId(data.courseId); // Store DB id for submit
        }
      } catch {
        setError("Failed to load quiz");
      } finally {
        setLoading(false);
      }
    }
    if (!alreadyCompleted && !chapterLocked && status === "authenticated") generateQuiz();
  }, [status, courseIdParam, chapterIndex, alreadyCompleted, chapterLocked]);

  const handleAnswerSelect = useCallback((answerIndex: number) => {
    if (isAnswered || !quizData) return;
    setSelectedAnswer(answerIndex);
    setIsAnswered(true);

    if (answerIndex === quizData.questions[currentQuestionIndex].correctAnswerIndex) {
      setScore((s) => s + 2);
    }

    setTimeout(() => {
      if (currentQuestionIndex < quizData.questions.length - 1) {
        setCurrentQuestionIndex((i) => i + 1);
        setSelectedAnswer(null);
        setIsAnswered(false);
      } else {
        setShowResult(true);
      }
    }, 1500);
  }, [isAnswered, quizData, currentQuestionIndex]);

  const submitQuiz = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: courseDbId, // Use resolved DB id
          cid: courseCid, // Also send cid as fallback
          chapterIndex,
          chapterName,
          score,
        }),
      });
      // Navigate back using cid (the URL identifier)
      router.push(`/feature-2/${courseCid}`);
    } catch (err) {
      setError("Failed to submit quiz");
      setSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowResult(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-sky-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-600 font-medium">Generating your quiz...</p>
      </div>
    );
  }

  if (alreadyCompleted) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Already Completed!</h1>
          <p className="text-slate-500 mb-6">You've already aced this chapter.</p>
          <button onClick={() => router.back()} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Go Back</button>
        </div>
      </div>
    );
  }

  if (chapterLocked) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-gray-700">Chapter Locked</h1>
          <p className="text-slate-500 mb-6">Complete Chapter {chapterIndex} first to unlock this quiz.</p>
          <button onClick={() => router.back()} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Go Back</button>
        </div>
      </div>
    );
  }

  if (!quizData || error) return null;

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const totalPossibleScore = quizData.questions.length * 2;

  return (
    <div className="min-h-screen relative p-4 overflow-hidden font-sans">
      <div className="fixed inset-0 z-0">
        <Image src="/cloud.png" alt="Background" fill className="object-cover opacity-80" priority />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto h-full flex flex-col">
        {/* Result Overlay */}
        {showResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-500">
            {[...Array(12)].map((_, i) => <div key={i} className={`confetti confetti-${i}`} />)}
            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl max-w-md w-full text-center border-4 border-white transform animate-pop">
              <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
              <h2 className="text-3xl font-black text-slate-800 mb-2">Quiz Complete!</h2>
              <div className="bg-slate-50 rounded-3xl p-6 mb-8">
                <div className="text-5xl font-black text-indigo-600">{score}<span className="text-slate-300 text-2xl">/{totalPossibleScore}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={resetQuiz} className="flex items-center justify-center gap-2 py-4 bg-slate-100 font-bold rounded-2xl"><RotateCcw className="w-5 h-5"/>Retake</button>
                <button onClick={submitQuiz} disabled={submitting} className="flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white font-bold rounded-2xl">
                  {submitting ? <Loader2 className="animate-spin" /> : <><Home className="w-5 h-5"/> Finish</>}
                </button>
              </div>
            </div>
          </div>
        )}

        <header className="mb-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-600 mb-4 font-medium"><ArrowLeft className="w-4 h-4"/> Back</button>
          <div className="flex justify-between items-center bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-4 shadow-sm">
            <div>
              <h1 className="font-bold text-slate-800">{chapterName}</h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{courseName}</p>
            </div>
            <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-bold">Score: {score}</div>
          </div>
          {/* Progress Bar */}
          <div className="mt-4 bg-white/50 rounded-full h-2 shadow-inner">
            <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${((currentQuestionIndex + 1) / quizData.questions.length) * 100}%` }} />
          </div>
        </header>

        {/* Floating Question Card */}
        <div className="mb-12 relative">
          <div className="relative bg-white/90 backdrop-blur-sm rounded-[2rem] p-10 shadow-xl border border-white animate-balloon text-center">
            <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold mb-4 uppercase">
              Question {currentQuestionIndex + 1} of {quizData.questions.length}
            </span>
            <p className="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed">{currentQuestion.question}</p>
          </div>
        </div>

        {/* Balloon Options UI */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-12 px-4 pb-12">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === currentQuestion.correctAnswerIndex;
            const style = OPTION_STYLES[index];

            return (
              <button
                key={index}
                disabled={isAnswered}
                onClick={() => handleAnswerSelect(index)}
                className="group relative flex flex-col items-center animate-balloon-slow"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className={`relative w-32 h-40 md:w-36 md:h-44 rounded-[50%_50%_50%_50%/40%_40%_60%_60%] flex items-center justify-center p-4 text-center text-white text-sm md:text-base font-bold bg-gradient-to-br ${style.bg} border-2 ${style.border} shadow-xl ${style.shadow} transition-all duration-300
                  ${!isAnswered ? "hover:-translate-y-4 hover:scale-110 active:scale-95" : ""}
                  ${isAnswered && isCorrect ? "animate-pop !from-emerald-400 !to-emerald-600 ring-4 ring-emerald-200" : ""}
                  ${isAnswered && isSelected && !isCorrect ? "animate-wiggle !from-rose-400 !to-rose-600" : ""}
                  ${isAnswered && !isSelected && !isCorrect ? "opacity-40 grayscale-[0.5]" : ""}
                `}>
                  <div className="absolute top-[10%] left-[15%] w-8 h-4 bg-white/30 rounded-[50%] rotate-[-20deg] blur-[2px]" />
                  <span className="relative z-10 drop-shadow-md leading-tight">{option}</span>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-3 bg-inherit" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
                </div>
                <div className="w-[1.5px] h-12 bg-slate-400/40 rounded-full mt-1 origin-top animate-string" />
              </button>
            );
          })}
        </div>
      </div>

      <style jsx global>{`
        @keyframes balloon { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(1deg); } }
        @keyframes balloonSlow { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-8px) rotate(-1deg); } }
        @keyframes string { 0%, 100% { transform: rotate(2deg); } 50% { transform: rotate(-2deg); } }
        @keyframes pop { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes wiggle { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-balloon { animation: balloon 5s ease-in-out infinite; }
        .animate-balloon-slow { animation: balloonSlow 6s ease-in-out infinite; }
        .animate-string { animation: string 4s ease-in-out infinite; }
        .animate-pop { animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .animate-wiggle { animation: wiggle 0.3s ease-in-out 2; }
        .confetti { position: absolute; width: 10px; height: 10px; top: -10px; opacity: 0; animation: confetti-fall 3s ease-in-out infinite; }
        ${[...Array(12)].map((_, i) => `.confetti-${i} { left: ${i * 8}%; background: ${['#f43f5e', '#38bdf8', '#10b981', '#fbbf24', '#8b5cf6'][i % 5]}; animation-delay: ${i * 0.2}s; }`).join('')}
        @keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
      `}</style>
    </div>
  );
}