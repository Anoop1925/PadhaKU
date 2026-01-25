"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Sparkles, Info, Brain, Hand, CheckCircle2, Lightbulb, Target, TrendingUp, Camera, Video, BookOpen, Zap } from "lucide-react";

// Groq API Key from environment variable
const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || "";

// Types
interface QuizQuestion {
  question: string;
  type: "mcq" | "msq" | "short" | "practical";
  options?: string[];
  hint: string;
  answer?: string;
  correctAnswers?: string[]; // For MSQ
}

interface QuizData {
  questions: QuizQuestion[];
}

interface QuizReport {
  summary: string;
  score?: number;
  feedback?: string;
}

interface QuizConfig {
  topic: string;
  questionType: "mcq" | "msq" | "practical" | "mixed";
  difficulty: "easy" | "medium" | "hard";
  age: number;
  useCameraGestures: boolean;
}

// Utility to dynamically load a script if not already present
function loadScript(src: string, globalName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>)[globalName]) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject());
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.body.appendChild(script);
  });
}

// Hand gesture detection hook
function useHandGestureDetection(
  onThumbsDown: () => void,
  onFingerCount: (count: number) => void,
  cameraActive: boolean,
  errorHandler: (msg: string) => void,
  mediaPipeLoaded: boolean,
  gesturesEnabled: boolean
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<unknown>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastGestureRef = useRef<{ gesture: string | null; fingerCount: number }>({ gesture: null, fingerCount: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!cameraActive || !mediaPipeLoaded) return;

    const initializeHands = async () => {
      if (!videoRef.current || !canvasRef.current || !isMounted) return;
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext("2d");
        if (!canvasCtx) return;

        // Request camera access with explicit user media
        try {
          console.log("Requesting camera access...");
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 480 },
              height: { ideal: 360 },
              facingMode: "user"
            },
            audio: false
          });
          
          console.log("Camera access granted, setting up video...");
          video.srcObject = stream;
          streamRef.current = stream;
          
          // Set video attributes
          video.autoplay = true;
          video.playsInline = true;
          video.muted = true;
          
          // Wait for video to be ready
          if (video.readyState >= 2) {
            await video.play();
          } else {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error("Video load timeout")), 10000);
              video.onloadedmetadata = async () => {
                clearTimeout(timeout);
                try {
                  await video.play();
                  resolve();
                } catch (e) {
                  reject(e);
                }
              };
              video.onerror = () => {
                clearTimeout(timeout);
                reject(new Error("Video error"));
              };
            });
          }
          console.log("Video is playing");
        } catch (err) {
          console.error("Camera error:", err);
          const error = err as Error;
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            setShowPermissionHelp(true);
            errorHandler("Camera access blocked. Please click 'Fix Permission' below for instructions.");
          } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorHandler("No camera found. Please connect a camera and try again.");
          } else {
            errorHandler("Failed to access camera: " + error.message);
          }
          return;
        }

        const detectGesture = (landmarks: Array<{ x: number; y: number; z: number }>): { gesture: string | null; fingerCount: number } => {
          const thumbTip = landmarks[4];
          const thumbIP = landmarks[3];
          const wrist = landmarks[0];
          
          // Detect thumbs down
          const isThumbDown = thumbTip.y > thumbIP.y && thumbTip.y > wrist.y;
          
          // Detect finger count (1-4 for option selection)
          const fingerTips = [
            landmarks[8],  // Index finger
            landmarks[12], // Middle finger
            landmarks[16], // Ring finger
            landmarks[20]  // Pinky finger
          ];
          
          const fingerPIPs = [
            landmarks[6],  // Index PIP
            landmarks[10], // Middle PIP
            landmarks[14], // Ring PIP
            landmarks[18]  // Pinky PIP
          ];
          
          let extendedFingers = 0;
          for (let i = 0; i < 4; i++) {
            // Finger is extended if tip is above PIP joint
            if (fingerTips[i].y < fingerPIPs[i].y - 0.02) {
              extendedFingers++;
            }
          }
          
          return {
            gesture: isThumbDown ? "thumbsDown" : null,
            fingerCount: extendedFingers
          };
        };

        const onResultsHands = (results: { image: CanvasImageSource; multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>> }): void => {
          if (!isMounted) return;
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
          canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            for (let index = 0; index < results.multiHandLandmarks.length; index++) {
              const landmarks = results.multiHandLandmarks[index];
              const win = window as unknown as Record<string, unknown>;
              if (typeof win.drawConnectors === "function" && typeof win.HAND_CONNECTIONS !== "undefined") {
                (win.drawConnectors as (ctx: CanvasRenderingContext2D, l: Array<{ x: number; y: number; z: number }>, c: unknown, o: { color: string }) => void)(canvasCtx, landmarks, win.HAND_CONNECTIONS, { color: "#00FF00" });
              }
              if (typeof win.drawLandmarks === "function") {
                (win.drawLandmarks as (ctx: CanvasRenderingContext2D, l: Array<{ x: number; y: number; z: number }>, o: { color: string; fillColor: string; radius: number }) => void)(canvasCtx, landmarks, {
                  color: "#00FF00",
                  fillColor: "#FF0000",
                  radius: 5,
                });
              }
              const gestureResult = detectGesture(landmarks);
              
              // Handle thumbs down gesture
              if (gestureResult.gesture === "thumbsDown" && lastGestureRef.current.gesture !== "thumbsDown") {
                lastGestureRef.current = gestureResult;
                onThumbsDown();
              } else if (gestureResult.gesture !== "thumbsDown" && lastGestureRef.current.gesture === "thumbsDown") {
                lastGestureRef.current = gestureResult;
              }
              
              // Handle finger count changes for option selection
              if (gesturesEnabled && gestureResult.fingerCount > 0 && gestureResult.fingerCount !== lastGestureRef.current.fingerCount) {
                lastGestureRef.current = gestureResult;
                if (onFingerCount) {
                  onFingerCount(gestureResult.fingerCount);
                }
              } else if (gestureResult.fingerCount === 0 && lastGestureRef.current.fingerCount > 0) {
                lastGestureRef.current = gestureResult;
              }
            }
          } else {
            if (lastGestureRef.current.gesture || lastGestureRef.current.fingerCount > 0) {
              lastGestureRef.current = { gesture: null, fingerCount: 0 };
            }
          }
          canvasCtx.restore();
        };

        const win = window as unknown as Record<string, unknown>;
        const HandsClass = typeof win.Hands === "function" ? (win.Hands as new (args: unknown) => { setOptions: (opts: unknown) => void; onResults: (cb: (results: unknown) => void) => void; send: (input: unknown) => Promise<void>; close: () => void }) : undefined;
        if (!HandsClass) {
          console.error("Hands class not found");
          errorHandler("Hands not found on window. Make sure @mediapipe/hands is loaded.");
          return;
        }
        console.log("Initializing MediaPipe Hands...");
        const hands = new HandsClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        hands.onResults((results: unknown) => {
          if (
            typeof results === 'object' && results !== null &&
            'image' in results &&
            'multiHandLandmarks' in results
          ) {
            const typedResults = results as { image: CanvasImageSource; multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>> };
            onResultsHands(typedResults);
          }
        });
        
        handsRef.current = hands;
        console.log("MediaPipe Hands initialized, camera ready!");
        setIsInitialized(true);

        // Process frames manually
        const processFrame = async () => {
          if (!isMounted || !video.readyState || video.paused) return;
          try {
            await hands.send({ image: video });
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            console.error("Error processing frame:", errMsg);
          }
          if (isMounted) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
          }
        };
        
        processFrame();

      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        errorHandler("Error initializing hands: " + errMsg);
      }
    };
    initializeHands();
    return () => {
      isMounted = false;
      
      // Stop animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Stop video stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Stop video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      // Close hands
      if (handsRef.current && typeof (handsRef.current as { onResults?: () => void; close?: () => void }).close === "function") {
        try {
          (handsRef.current as { onResults?: () => void; close: () => void }).onResults = () => {};
          (handsRef.current as { close: () => void }).close();
        } catch {
        } finally {
          handsRef.current = null;
        }
      }
    };
  }, [cameraActive, onThumbsDown, errorHandler, mediaPipeLoaded]);

  return { videoRef, canvasRef, isInitialized };
}

// Helper function for retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isLastRetry = i === maxRetries - 1;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if it's a retryable error (overloaded, rate limit, etc.)
      const isRetryable = errorMessage.includes("overloaded") || 
                          errorMessage.includes("429") ||
                          errorMessage.includes("Resource exhausted");
      
      if (isLastRetry || !isRetryable) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries reached");
}

// Gemini API helpers
async function fetchQuiz(config: QuizConfig): Promise<QuizData> {
  // Build age-appropriate language
  const ageContext = config.age < 12 
    ? "Use simple, friendly language suitable for children. Avoid complex terminology." 
    : config.age < 18 
    ? "Use clear, educational language suitable for teenagers." 
    : "Use professional, academic language suitable for adults.";
  
  // Build difficulty context
  const difficultyContext = 
    config.difficulty === "easy" 
      ? "Keep questions straightforward and basic. Focus on fundamental concepts."
      : config.difficulty === "hard"
      ? "Make questions challenging with deeper analysis and critical thinking."
      : "Balance between basic and advanced concepts.";
  
  // Build question type instructions
  let typeInstructions = "";
  let questionTypeJson = "";
  
  if (config.questionType === "mcq") {
    typeInstructions = "Generate ONLY multiple choice questions (MCQ) with 4 options each.";
    questionTypeJson = `"type": "mcq",\n    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],\n    "answer": "Correct option text",`;
  } else if (config.questionType === "msq") {
    typeInstructions = "Generate ONLY multiple select questions (MSQ) with 4 options where multiple answers can be correct.";
    questionTypeJson = `"type": "msq",\n    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],\n    "correctAnswers": ["Correct option 1", "Correct option 2"],`;
  } else if (config.questionType === "practical") {
    typeInstructions = "Generate ONLY practical, hands-on questions that test real-world application.";
    questionTypeJson = `"type": "short",\n    "answer": "Expected answer or key points",`;
  } else {
    typeInstructions = "Mix different question types: MCQ, MSQ, and practical short-answer questions.";
    questionTypeJson = `"type": "mcq" | "msq" | "short",\n    // For MCQ: "options" array and "answer" string\n    // For MSQ: "options" array and "correctAnswers" array\n    // For short: "answer" string only`;
  }

  const prompt = `Generate 5 quiz questions on the topic "${config.topic}". 

CONTEXT:
- Target age: ${config.age} years old (${ageContext})
- Difficulty level: ${config.difficulty} (${difficultyContext})
- Question type: ${config.questionType} (${typeInstructions})
${config.useCameraGestures ? "- These questions will be answered using hand gestures via camera, so for MCQs keep options clear and distinct." : ""}

IMPORTANT: Return ONLY a valid JSON array, nothing else. No markdown, no code blocks, no explanations.

For each question, provide:
- question: The question text (age-appropriate)
- type: "${config.questionType === "mixed" ? "mcq, msq, or short" : config.questionType}"
${config.questionType === "mcq" || config.questionType === "mixed" ? '- options: If MCQ, exactly 4 options as an array of strings\n- answer: The correct answer (must match one option exactly)' : ''}
${config.questionType === "msq" || config.questionType === "mixed" ? '- options: If MSQ, exactly 4 options as an array of strings\n- correctAnswers: Array of correct answers (must match options exactly)' : ''}
${config.questionType === "practical" || config.questionType === "mixed" ? '- answer: For short/practical questions, the expected answer or key points' : ''}
- hint: A helpful hint (age-appropriate)

JSON format example:
[
  {
    "question": "Age-appropriate question text?",
    ${questionTypeJson}
    "hint": "Helpful hint"
  }
]

Return ONLY the JSON array, no other text.`;

  return retryWithBackoff(async () => {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are an expert quiz generator. You generate educational quizzes in valid JSON format only. Never include markdown formatting or explanations, just pure JSON."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    let text = result.choices?.[0]?.message?.content || "";
    
    // Remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Try to extract JSON from the response
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error("Raw API response:", text);
      throw new Error("No JSON array found in API response");
    }
    
    text = text.slice(jsonStart, jsonEnd + 1);
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const questions = JSON.parse(text);
      
      // Validate the questions
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Invalid questions format");
      }
      
      return { questions };
    } catch (error) {
      console.error("Failed to parse:", text);
      console.error("Parse error:", error);
      throw new Error("Failed to parse quiz questions from Groq API. Please try again.");
    }
  });
}

async function fetchReport(
  questions: QuizQuestion[],
  answers: string[],
  hintsInfo: { question: string; hintTaken: boolean }[],
  score: number
): Promise<QuizReport> {
  const prompt = `Given the following quiz questions, the user's answers, the correct answers, and which questions had hints shown, generate a short, crisp, highly personalized report (max 3-4 sentences for the summary).\nInclude:\n- A short summary (max 3-4 sentences, highly personalized, not generic)\n- The user's score out of 5 (show this first)\n- Feedback for improvement\n- A table listing for each question: the question, the user's answer, the correct answer, whether a hint was used, and a suggestion for the user for that question\n- Make the report visually engaging and professional, using clear sections and formatting.\n\nQuestions: ${JSON.stringify(
    questions
  )}\nAnswers: ${JSON.stringify(answers)}\nHintsTaken: ${JSON.stringify(
    hintsInfo
  )}\nScore: ${score}`;
  
  return retryWithBackoff(async () => {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are an expert educational assessment analyst. Generate personalized, constructive quiz reports with detailed feedback."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 2000,
        }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }
    
    const result = await response.json();
    const text = result.choices?.[0]?.message?.content || "No report generated.";
    return { summary: text, score };
  });
}

// Helper to extract 'Areas for Improvement' and remove markdown tables from summary
function extractAreasAndCleanSummary(summary: string) {
  let areas = "";
  let cleaned = summary;
  // Extract 'Areas for Improvement' section if present
  const areasMatch = summary.match(
    /\*\*Areas for Improvement:?\*\*[\s\S]*?(?=(\n\n|$))/i
  );
  if (areasMatch) {
    areas = areasMatch[0];
    cleaned = summary.replace(areas, "");
  }
  // Remove markdown tables from summary
  cleaned = cleaned.replace(/\|(.|\n)*?\|(.|\n)*?\|/g, "");
  return { areas, cleaned };
}

// About Content Component
const AboutContent: React.FC = () => {
  return (
    <div className="space-y-12">
      {/* How It Works Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#387BFF]" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">1. Configure Your Quiz</h3>
              <p className="text-sm text-gray-600">
                Choose your topic, question type (MCQ/MSQ/Practical/Mixed), difficulty level (Easy/Medium/Hard), and target age for age-appropriate content
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Hand className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">2. Enable Gesture Controls (Optional)</h3>
              <p className="text-sm text-gray-600">
                Activate camera gestures for hands-free quiz taking - perfect for motor-impaired users. Use 1-4 fingers to select options!
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#387BFF]" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">3. AI Generates Personalized Quiz</h3>
              <p className="text-sm text-gray-600">
                Gemini 2.5 Flash creates 5 questions customized to your preferences - age-appropriate language, right difficulty, and your chosen format
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">4. Answer with Clicks or Gestures</h3>
              <p className="text-sm text-gray-600">
                Click options normally OR use hand gestures (1 finger = Option 1, 2 fingers = Option 2, etc.). Thumbs down anytime for hints!
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">5. Review Detailed Analytics</h3>
              <p className="text-sm text-gray-600">
                Get AI-powered feedback with your score, personalized insights, and specific improvement suggestions. Export as PDF to track progress!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-[#387BFF]" />
              <h3 className="font-semibold text-gray-900">Configurable Quiz Setup</h3>
            </div>
            <p className="text-sm text-gray-600">
              Choose topic, question type, difficulty, and age for fully personalized quizzes
            </p>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-2">
              <Hand className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-gray-900">Gesture-Based Answering</h3>
            </div>
            <p className="text-sm text-gray-600">
              Show 1-4 fingers to select options hands-free - perfect for accessibility!
            </p>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-2">
              <Camera className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Thumbs Down for Hints</h3>
            </div>
            <p className="text-sm text-gray-600">
              MediaPipe-powered gesture recognition detects thumbs down for instant help
            </p>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">4 Question Types</h3>
            </div>
            <p className="text-sm text-gray-600">
              MCQ, MSQ (multiple select), Practical application, or Mixed for variety
            </p>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 hover:border-amber-300 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900">Age-Appropriate Content</h3>
            </div>
            <p className="text-sm text-gray-600">
              AI generates content suitable for ages 5-100 with appropriate language
            </p>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold text-gray-900">Smart Analytics & PDF Export</h3>
            </div>
            <p className="text-sm text-gray-600">
              Detailed reports with personalized feedback, downloadable for progress tracking
            </p>
          </div>
        </div>
      </div>

      {/* Perfect For Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Perfect For</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <div className="w-10 h-10 rounded-lg bg-[#387BFF] text-white flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Students of All Ages</h4>
            <p className="text-sm text-gray-600">Age-appropriate content from children to adults</p>
          </div>

          <div className="p-5 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
            <div className="w-10 h-10 rounded-lg bg-purple-500 text-white flex items-center justify-center mb-3">
              <Hand className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Motor-Impaired Users</h4>
            <p className="text-sm text-gray-600">Hands-free gesture controls for accessibility</p>
          </div>

          <div className="p-5 rounded-lg bg-gradient-to-br from-blue-50 to-blue-50 border border-blue-100">
            <div className="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center mb-3">
              <Lightbulb className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Educators & Teachers</h4>
            <p className="text-sm text-gray-600">Customizable assessments with difficulty control</p>
          </div>

          <div className="p-5 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-100">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center mb-3">
              <Brain className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Self-Learners</h4>
            <p className="text-sm text-gray-600">Personalized difficulty and topic selection</p>
          </div>

          <div className="p-5 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
            <div className="w-10 h-10 rounded-lg bg-green-500 text-white flex items-center justify-center mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Quick Practice</h4>
            <p className="text-sm text-gray-600">Fast, focused quizzes on any topic</p>
          </div>

          <div className="p-5 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-100">
            <div className="w-10 h-10 rounded-lg bg-indigo-500 text-white flex items-center justify-center mb-3">
              <Target className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Skill Assessment</h4>
            <p className="text-sm text-gray-600">Test practical application with mixed formats</p>
          </div>
        </div>
      </div>

      {/* Pro Tips Section */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Pro Tips</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>Configure before starting:</strong> Choose your difficulty and question type for the best learning experience</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>Enable gesture controls:</strong> Perfect for hands-free operation - just hold up 1-4 fingers to select options!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>Set appropriate age:</strong> AI generates age-suitable language and examples for better comprehension</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>Use thumbs down anytime:</strong> The camera detects this gesture instantly for helpful hints</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>Try different question types:</strong> MSQ and Practical questions test deeper understanding</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>Track your progress:</strong> Export detailed reports as PDF to monitor improvement over time</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Accessibility Highlight */}
      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <Hand className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">🌟 Accessibility Features</h3>
            <p className="text-sm text-gray-700 mb-3">
              Our Quiz Generator is designed with inclusivity in mind, offering hands-free controls perfect for users with motor impairments or limited mobility.
            </p>
            <div className="bg-white rounded-lg p-5 space-y-3 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">Gesture Controls:</p>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
                <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                  <span className="text-purple-600 font-bold">👆 1 Finger</span>
                  <span>→ Option 1</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                  <span className="text-purple-600 font-bold">✌️ 2 Fingers</span>
                  <span>→ Option 2</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                  <span className="text-purple-600 font-bold">🤟 3 Fingers</span>
                  <span>→ Option 3</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                  <span className="text-purple-600 font-bold">🖐️ 4 Fingers</span>
                  <span>→ Option 4</span>
                </div>
              </div>
              <p className="text-sm text-gray-700 pt-2 border-t border-gray-200">
                <strong className="text-purple-700">👎 Thumbs Down</strong> anytime for hints • Fully optional - works with mouse/keyboard too!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuizPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"about" | "quiz">("quiz");
  const [step, setStep] = useState<"setup" | "quiz" | "report">("setup");
  const [quizConfig, setQuizConfig] = useState<QuizConfig>({
    topic: "",
    questionType: "mcq",
    difficulty: "medium",
    age: 18,
    useCameraGestures: false
  });
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [report, setReport] = useState<QuizReport | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [hintsTaken, setHintsTaken] = useState<boolean[]>([]);
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [detectedFingers, setDetectedFingers] = useState<number>(0);

  useEffect(() => {
    async function ensureMediaPipe() {
      try {
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js",
          "Hands"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
          "Camera"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
          "drawConnectors"
        );
        setMediaPipeLoaded(true);
      } catch {
        // Optionally, set an error state here
      }
    }
    ensureMediaPipe();
  }, []);

  const {
    videoRef,
    canvasRef,
    isInitialized,
  } = useHandGestureDetection(
    () => {
      setShowHint(true);
      setHintsTaken((prev) => {
        const updated = [...prev];
        // Ensure array is correct length
        if (quiz && updated.length !== quiz.questions.length) {
          return Array(quiz.questions.length)
            .fill(false)
            .map((v, i) => (i === current ? true : v));
        }
        updated[current] = true;
        return updated;
      });
    },
    (fingerCount: number) => {
      // Update visual feedback
      setDetectedFingers(fingerCount);
      
      // Handle finger count for option selection (1-4)
      if (quiz && quiz.questions[current] && quiz.questions[current].type === "mcq") {
        const optionIndex = fingerCount - 1;
        const currentQuestion = quiz.questions[current];
        if (currentQuestion.options && optionIndex >= 0 && optionIndex < currentQuestion.options.length) {
          handleAnswer(currentQuestion.options[optionIndex]);
        }
      }
    },
    cameraActive,
    () => {},
    mediaPipeLoaded,
    true // Enable gesture-based option selection
  );

  // Start quiz
  const startQuiz = async () => {
    setLoading(true);
    setError("");
    setShowHint(false);
    setQuiz(null);
    setAnswers([]);
    setCurrent(0);
    setReport(null);
    setHintsTaken([]);
    
    // Activate camera if gestures are enabled
    if (quizConfig.useCameraGestures) {
      setCameraActive(true);
    }
    
    try {
      const data = await fetchQuiz(quizConfig);
      setQuiz(data);
      setHintsTaken(Array(data.questions.length).fill(false));
      setStep("quiz");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch quiz.");
    } finally {
      setLoading(false);
    }
  };

  // Submit quiz
  const submitQuiz = async () => {
    setLoading(true);
    setError("");
    try {
      if (!quiz) throw new Error("No quiz data.");
      // Prepare hint usage info for the report
      const hintsInfo = quiz.questions.map((q, idx) => ({
        question: q.question,
        hintTaken: hintsTaken[idx],
      }));
      // Calculate score locally
      let score = 0;
      quiz.questions.forEach((q, idx) => {
        const userAns = (answers[idx] || "").trim().toLowerCase();
        const correctAns = (q.answer || "").trim().toLowerCase();
        if (userAns && correctAns && userAns === correctAns) score++;
      });
      const rep = await fetchReport(quiz.questions, answers, hintsInfo, score);
      rep.score = score;
      setReport(rep);
      setStep("report");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  // Handle answer change
  const handleAnswer = (ans: string) => {
    const newAnswers = [...answers];
    newAnswers[current] = ans;
    setAnswers(newAnswers);
    setShowHint(false);
  };

  // Next question
  const nextQuestion = () => {
    setShowHint(false);
    setCurrent((c) => c + 1);
  };

  // Restart
  const restart = () => {
    setStep("setup");
    setQuizConfig({
      topic: "",
      questionType: "mcq",
      difficulty: "medium",
      age: 18,
      useCameraGestures: false
    });
    setQuiz(null);
    setAnswers([]);
    setCurrent(0);
    setShowHint(false);
    setReport(null);
    setError("");
    setCameraActive(false);
  };

  // PDF Download Handler
  const handleDownloadPDF = async () => {
    const reportCard = document.getElementById("quiz-report-card");
    if (!reportCard) return;

    // Store original styles
    const originalBg = reportCard.style.background;
    const originalColor = reportCard.style.color;

    // Force supported colors
    reportCard.style.background = "#fff";
    reportCard.style.color = "#111";

    const canvas = await html2canvas(reportCard);

    // Restore original styles
    reportCard.style.background = originalBg;
    reportCard.style.color = originalColor;

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight);
    pdf.save("quiz-report.pdf");
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // UI
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Quiz Master</h1>
              <p className="text-base text-gray-500">
                Interactive quizzes with AI-powered evaluation and gesture-based hints
              </p>
            </div>
            <button
              onClick={() => {
                setActiveTab("quiz");
                if (step === "report") {
                  setStep("setup");
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-[#387BFF] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white rounded-lg font-semibold text-sm shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Take Quiz</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 gap-0">
            <button
              onClick={() => setActiveTab("quiz")}
              className={`flex items-center justify-center gap-2 px-6 py-4 font-medium text-sm transition-all ${
                activeTab === "quiz"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Brain className="w-4 h-4" />
              Quiz
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`flex items-center justify-center gap-2 px-6 py-4 font-medium text-sm transition-all ${
                activeTab === "about"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Info className="w-4 h-4" />
              About
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* About Tab */}
        {activeTab === "about" && <AboutContent />}

        {/* Quiz Tab */}
        {activeTab === "quiz" && (
          <div className="space-y-8">
            <Card className="p-8 max-w-2xl mx-auto">
              <div className="flex flex-col items-center">
                {/* Camera Section */}
                {!mediaPipeLoaded && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#387BFF] mb-2"></div>
                    <div className="text-[#387BFF] text-sm font-medium">
                      Loading camera and hand detection...
                    </div>
                  </div>
                )}
                {mediaPipeLoaded && (
                  <div className="flex flex-col items-center w-full">
                    {!cameraActive ? (
                      <div className="flex flex-col items-center gap-4 p-8">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                          <Camera className="w-8 h-8 text-[#387BFF]" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Enable Camera for Gesture Hints</h3>
                        <p className="text-sm text-gray-600 text-center max-w-md">
                          Start the camera to use thumbs down gesture for hints during the quiz
                        </p>
                        <Button
                          onClick={() => {
                            console.log("Start Camera button clicked");
                            setCameraActive(true);
                          }}
                          className="bg-gradient-to-r from-[#387BFF] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white px-6 py-2 flex items-center gap-2 mt-4"
                        >
                          <Video className="w-4 h-4" />
                          Start Camera
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 justify-center">
                          <Camera className="w-4 h-4" />
                          <span>
                            {isInitialized 
                              ? "Show thumbs down for hints" 
                              : "Initializing camera..."}
                          </span>
                        </div>
                        <div className="relative w-[640px] h-[480px] rounded-lg overflow-hidden border-2 border-gray-200 bg-black shadow-lg mx-auto">
                          <video
                            ref={videoRef}
                            playsInline
                            autoPlay
                            muted
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              transform: "scaleX(-1)",
                              zIndex: 1,
                              display: "block",
                            }}
                          />
                          <canvas
                            ref={canvasRef}
                            width={640}
                            height={480}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              pointerEvents: "none",
                              transform: "scaleX(-1)",
                              zIndex: 2,
                            }}
                          />
                          {!isInitialized && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                              <p className="text-sm">Starting camera...</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Gesture Status Indicator */}
                        {cameraActive && isInitialized && quizConfig.useCameraGestures && step === "quiz" && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-center gap-2">
                              {detectedFingers > 0 ? (
                                <>
                                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                  <span className="text-sm font-medium text-gray-900">
                                    Detected: {detectedFingers} finger{detectedFingers > 1 ? 's' : ''} → Option {detectedFingers}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                  <span className="text-sm text-gray-600">
                                    Show 1-4 fingers to select an option
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {cameraActive && !isInitialized && (
                          <button
                            onClick={() => {
                              console.log("Resetting camera...");
                              setCameraActive(false);
                              setError("");
                            }}
                            className="mt-2 text-sm text-gray-600 hover:text-gray-900 underline mx-auto block"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="w-full space-y-3">
                    <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
                      {error}
                    </div>
                    {showPermissionHelp && (
                      <div className="w-full p-6 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                          <Camera className="w-5 h-5" />
                          How to Fix Camera Permission in Chrome
                        </h4>
                        <ol className="space-y-2 text-sm text-blue-800">
                          <li className="flex gap-2">
                            <span className="font-semibold">1.</span>
                            <span>Click the <strong>lock icon 🔒</strong> or <strong>camera icon 🎥</strong> in the address bar (left side of URL)</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="font-semibold">2.</span>
                            <span>Find <strong>"Camera"</strong> and change it to <strong>"Allow"</strong></span>
                          </li>
                          <li className="flex gap-2">
                            <span className="font-semibold">3.</span>
                            <span>Click <strong>"Reload"</strong> or refresh the page (F5)</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="font-semibold">4.</span>
                            <span>Click <strong>"Start Camera"</strong> button again</span>
                          </li>
                        </ol>
                        <div className="mt-4 p-3 bg-white rounded border border-blue-300">
                          <p className="text-xs text-blue-700">
                            <strong>Alternative:</strong> Type <code className="bg-blue-100 px-1 py-0.5 rounded">chrome://settings/content/camera</code> in address bar and ensure localhost is not blocked
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setShowPermissionHelp(false);
                            setCameraActive(false);
                            setError("");
                          }}
                          className="mt-4 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                        >
                          Got it, I'll try again
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Quiz Setup Screen */}
                {step === "setup" && (
                  <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
                    <div className="space-y-6">
                      {/* Topic Input */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Quiz Topic <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="text"
                          className="!text-black bg-white border border-gray-300 rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-[#387BFF] placeholder:text-gray-400"
                          placeholder="e.g. Algebra, World War II, Photosynthesis"
                          value={quizConfig.topic}
                          onChange={(e) => setQuizConfig({...quizConfig, topic: e.target.value})}
                          disabled={loading}
                        />
                      </div>

                      {/* Question Type */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Question Type
                        </label>
                        <select
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#387BFF] bg-white text-black"
                          value={quizConfig.questionType}
                          onChange={(e) => setQuizConfig({...quizConfig, questionType: e.target.value as QuizConfig["questionType"]})}
                          disabled={loading}
                        >
                          <option value="mcq">Multiple Choice (MCQ)</option>
                          <option value="msq">Multiple Select (MSQ)</option>
                          <option value="practical">Practical/Application</option>
                          <option value="mixed">Mixed Types</option>
                        </select>
                      </div>

                      {/* Difficulty */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Difficulty Level
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {(["easy", "medium", "hard"] as const).map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setQuizConfig({...quizConfig, difficulty: level})}
                              disabled={loading}
                              className={`px-4 py-3 rounded-lg font-medium capitalize transition-all ${
                                quizConfig.difficulty === level
                                  ? "bg-[#387BFF] text-white shadow-md"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Age */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Age (for age-appropriate content)
                        </label>
                        <Input
                          type="number"
                          min="5"
                          max="100"
                          className="!text-black bg-white border border-gray-300 rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-[#387BFF]"
                          value={quizConfig.age}
                          onChange={(e) => setQuizConfig({...quizConfig, age: parseInt(e.target.value) || 18})}
                          disabled={loading}
                        />
                      </div>

                      {/* Camera Gestures */}
                      <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="camera-gestures"
                            checked={quizConfig.useCameraGestures}
                            onChange={(e) => setQuizConfig({...quizConfig, useCameraGestures: e.target.checked})}
                            disabled={loading}
                            className="mt-1 w-4 h-4 text-[#387BFF] border-gray-300 rounded focus:ring-[#387BFF]"
                          />
                          <div className="flex-1">
                            <label htmlFor="camera-gestures" className="font-medium text-gray-900 cursor-pointer">
                              Enable Camera Gestures (Recommended for Fun)
                            </label>
                            <p className="text-sm text-gray-600 mt-1">
                              Use hand gestures to answer questions:
                            </p>
                            <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
                              <li>• Show <strong>1 finger</strong> to select Option 1</li>
                              <li>• Show <strong>2 fingers</strong> to select Option 2</li>
                              <li>• Show <strong>3 fingers</strong> to select Option 3</li>
                              <li>• Show <strong>4 fingers</strong> to select Option 4</li>
                              <li>• <strong>Thumbs down</strong> to reveal hints</li>
                            </ul>
                            <p className="text-xs text-blue-700 mt-2 font-medium">
                              Perfect for users with limited mobility or motor impairments!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={startQuiz}
                      disabled={!quizConfig.topic.trim() || loading || !mediaPipeLoaded}
                      className="w-full bg-gradient-to-r from-[#387BFF] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white py-3 text-base font-medium"
                    >
                      {loading ? "Generating Quiz..." : "Start Quiz"}
                    </Button>
                    {!mediaPipeLoaded && (
                      <div className="text-gray-500 text-sm text-center">Loading camera support...</div>
                    )}
                  </div>
                )}

                {/* Quiz Screen */}
                {step === "quiz" && quiz && (
                  <div className="flex flex-col gap-6 w-full">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-base font-semibold text-[#387BFF]">
                          Question {current + 1} of {quiz.questions.length}
                        </div>
                      </div>
                      <div className="text-gray-900 text-lg font-medium mb-4">
                        {quiz.questions[current].question}
                      </div>
                      
                      {quiz.questions[current].type === "mcq" &&
                        quiz.questions[current].options && (
                          <div className="flex flex-col gap-2">
                            {quiz.questions[current].options.map((opt, idx) => (
                              <Button
                                key={idx}
                                variant={answers[current] === opt ? "default" : "outline"}
                                className={`text-left justify-start h-auto py-3 px-4 ${
                                  answers[current] === opt
                                    ? "bg-[#387BFF] hover:bg-[#2563eb] text-white border-[#387BFF]"
                                    : "hover:bg-gray-50 hover:border-[#387BFF]"
                                }`}
                                onClick={() => handleAnswer(opt)}
                                disabled={loading}
                              >
                                {opt}
                              </Button>
                            ))}
                          </div>
                        )}
                      
                      {quiz.questions[current].type === "short" && (
                        <Input
                          type="text"
                          style={{ color: "#111", background: "#fff" }}
                          className="mt-2 border-2 border-gray-300 rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-gray-400"
                          placeholder="Type your answer..."
                          value={answers[current] || ""}
                          onChange={(e) => handleAnswer(e.target.value)}
                          disabled={loading}
                        />
                      )}
                      
                      {showHint && (
                        <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-900 rounded-lg flex items-start gap-3">
                          <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Hint:</span>{" "}
                            {quiz.questions[current].hint}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                      <Button
                        variant="ghost"
                        className="text-gray-500 hover:text-purple-600 hover:bg-purple-50 text-sm font-medium flex items-center gap-2"
                        onClick={() => setShowHint(true)}
                        disabled={showHint}
                      >
                        <Lightbulb className="w-4 h-4" />
                        Show Hint
                      </Button>
                      {current < quiz.questions.length - 1 ? (
                        <Button
                          onClick={nextQuestion}
                          disabled={!answers[current] || loading}
                          className="bg-purple-500 hover:bg-purple-600 text-white"
                        >
                          Next Question
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={submitQuiz}
                          disabled={
                            answers.length < quiz.questions.length ||
                            answers.some((a) => !a) ||
                            loading
                          }
                        >
                          {loading ? "Submitting..." : "Submit Quiz"}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Report Screen */}
                {step === "report" && report && (() => {
                  const { areas, cleaned } = extractAreasAndCleanSummary(report.summary);
                  return (
                    <div className="flex flex-col gap-8 items-center w-full">
                      <div className="text-2xl font-bold text-green-700 mb-2">
                        Quiz Report
                      </div>
                      <Card id="quiz-report-card" className="w-full bg-white border border-gray-200 rounded-lg p-8 flex flex-col gap-8 shadow-sm">
                        <div className="text-lg font-bold text-gray-900 mb-2">
                          Summary
                        </div>
                        <div className="prose max-w-none text-gray-700 bg-gray-50 rounded-lg p-4">
                          <ReactMarkdown>{cleaned}</ReactMarkdown>
                        </div>
                        <div className="text-lg font-bold text-gray-900 mb-2 mt-6">
                          Detailed Breakdown
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="min-w-full bg-white text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-3 text-left text-gray-700 font-semibold">
                                  #
                                </th>
                                <th className="px-4 py-3 text-left text-gray-700 font-semibold">
                                  Question
                                </th>
                                <th className="px-4 py-3 text-left text-gray-700 font-semibold">
                                  Your Answer
                                </th>
                                <th className="px-4 py-3 text-left text-gray-700 font-semibold">
                                  Correct Answer
                                </th>
                                <th className="px-4 py-3 text-left text-gray-700 font-semibold">
                                  Hint
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {quiz?.questions.map((q, idx) => (
                                <tr
                                  key={idx}
                                  className={
                                    hintsTaken[idx]
                                      ? "bg-yellow-50"
                                      : idx % 2 === 0
                                      ? "bg-white"
                                      : "bg-gray-50"
                                  }
                                >
                                  <td className="px-4 py-3 font-semibold text-gray-700 align-top">
                                    {idx + 1}
                                  </td>
                                  <td className="px-4 py-3 text-gray-800 max-w-xs whitespace-pre-wrap align-top">
                                    {q.question}
                                  </td>
                                  <td className="px-4 py-3 text-blue-600 font-semibold align-top">
                                    {answers[idx]}
                                  </td>
                                  <td className="px-4 py-3 text-green-600 font-semibold align-top">
                                    {q.answer || (
                                      <span className="italic text-gray-400">
                                        N/A
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    {hintsTaken[idx] ? (
                                      <span className="text-yellow-600 font-semibold">
                                        Hint Used
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">No Hint</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {/* Hints Used Summary */}
                        <div className="mt-4 text-gray-800 text-sm">
                          <div className="text-base font-bold mb-2">Questions where hints were used:</div>
                          {quiz?.questions.some((q, idx) => hintsTaken[idx]) ? (
                            <ul className="list-disc list-inside space-y-1 text-gray-600">
                              {quiz?.questions.map((q, idx) =>
                                hintsTaken[idx] ? (
                                  <li key={idx}>
                                    <span className="font-semibold">Q{idx + 1}:</span> {q.question}
                                  </li>
                                ) : null
                              )}
                            </ul>
                          ) : (
                            <span className="text-gray-500">No hints were used.</span>
                          )}
                        </div>
                        {areas && (
                          <div className="mt-6">
                            <div className="text-lg font-bold text-gray-900 mb-2">
                              Areas for Improvement
                            </div>
                            <div className="prose max-w-none text-gray-700 bg-gray-50 rounded-lg p-4">
                              <ReactMarkdown>{areas}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </Card>
                      <div className="flex gap-4 mt-6">
                        <Button
                          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg shadow-sm transition-all duration-200"
                          onClick={restart}
                        >
                          Take Another Quiz
                        </Button>
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow-sm transition-all duration-200"
                          onClick={handlePrint}
                        >
                          Print / Save as PDF
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizPage;

<style jsx global>{`
  @media print {
    body * {
      visibility: hidden !important;
    }
    #quiz-report-card, #quiz-report-card * {
      visibility: visible !important;
    }
    #quiz-report-card {
      position: absolute !important;
      left: 0; top: 0; width: 100vw !important; background: #fff !important;
      box-shadow: none !important;
      color: #111 !important;
    }
  }
`}</style>
function setShowPermissionHelp(arg0: boolean) {
  throw new Error("Function not implemented.");
}

