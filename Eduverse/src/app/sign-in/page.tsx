'use client';

import { signIn } from "next-auth/react";
import { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen, ArrowRight, Users } from "lucide-react";
import SharedNavbar from "@/components/SharedNavbar";

type UserType = 'student' | 'teacher';

export default function SignInPage() {
  const [isDark, setIsDark] = useState(false);
  const [selectedType, setSelectedType] = useState<UserType | null>(null);

  const handleGoogleAuth = async (userType: UserType) => {
    await signIn("google", {
      callbackUrl: userType === 'teacher' ? "/teacher/dashboard" : "/dashboard",
      // Pass user type as state to identify during callback
    });
  };

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-gray-950' : 'bg-gray-50'}`}>
      {/* SHARED NAVBAR */}
      <SharedNavbar 
        isDark={isDark}
        setIsDark={setIsDark}
        showNavItems={true}
      />

      {/* MAIN CONTENT */}
      <div className="relative min-h-screen flex items-center justify-center pt-32 pb-24 px-8 overflow-hidden">
        {/* BACKGROUND GRADIENT */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a2463] via-[#1e4fb8] via-[#2563eb] via-[#3d5ab8] to-[#4a4ab0]"></div>
          <div className="absolute inset-0 bg-black/20"></div>

          {/* ANIMATED GRID */}
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="auth-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#auth-grid)" />
            </svg>
          </div>

          {/* ANIMATED CIRCLES */}
          <div className="absolute inset-0">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-white/10"
                style={{
                  width: `${300 + i * 100}px`,
                  height: `${300 + i * 100}px`,
                  left: '50%',
                  top: '50%',
                  x: '-50%',
                  y: '-50%',
                }}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 3 + i,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.5,
                }}
              />
            ))}
          </div>
        </div>

        {/* DUAL AUTH CONTAINER */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 w-full max-w-6xl"
        >
          <div className="backdrop-blur-2xl bg-white/10 dark:bg-gray-900/40 rounded-3xl border border-white/20 dark:border-gray-700/50 shadow-2xl overflow-hidden">
            
            {/* HEADER */}
            <div className="text-center py-8 px-6 border-b border-white/20">
              <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
                Welcome to PadhaKU
              </h1>
              <p className="text-gray-300">Choose how you want to sign in</p>
            </div>

            {/* TWO-COLUMN LAYOUT */}
            <div className="grid md:grid-cols-2 divide-x divide-white/20">
              
              {/* TEACHER SIDE - LEFT */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-8 md:p-12 relative group cursor-pointer"
                onClick={() => setSelectedType('teacher')}
              >
                {/* GLOW EFFECT */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                  {/* ICON */}
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <GraduationCap className="w-12 h-12 text-white" />
                  </div>

                  {/* TITLE */}
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Teacher Portal</h2>
                    <p className="text-gray-300">Manage classrooms, assignments & analytics</p>
                  </div>

                  {/* FEATURES */}
                  <div className="space-y-3 text-left w-full">
                    <div className="flex items-center gap-3 text-gray-200">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <span>Create and manage classrooms</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-200">
                      <div className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span>Assign coursework & track progress</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-200">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>View comprehensive analytics</span>
                    </div>
                  </div>

                  {/* SIGN IN BUTTON */}
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGoogleAuth('teacher');
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 rounded-2xl shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 font-semibold group/btn"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#EA4335" d="M24 9.5c3.15 0 5.75 1.1 7.66 2.89l5.7-5.7C33.39 3.21 28.98 1.5 24 1.5 14.84 1.5 7.19 7.84 4.68 16.26l6.95 5.4C13.29 14.75 18.19 9.5 24 9.5z"/>
                      <path fill="#34A853" d="M43.63 20.26H24v7.5h11.4c-1.34 3.58-4.39 6.44-8.4 7.5l6.95 5.4C40.81 36.16 44 30.07 44 24c0-.97-.1-1.92-.27-2.84l-.1-.9z"/>
                      <path fill="#FBBC05" d="M10.38 28.84C9.42 26.65 9 24.38 9 22c0-2.38.42-4.65 1.38-6.84L3.43 9.76C1.26 13.1 0 17.42 0 22s1.26 8.9 3.43 12.24l6.95-5.4z"/>
                      <path fill="#4285F4" d="M24 44.5c6.56 0 12.08-2.16 16.1-5.86l-6.95-5.4c-2.13 1.43-4.86 2.26-8.15 2.26-5.81 0-10.71-5.25-12.37-12.16l-6.95 5.4C7.19 40.16 14.84 44.5 24 44.5z"/>
                    </svg>
                    <span className="flex items-center gap-2">
                      Sign in as Teacher
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </span>
                  </motion.button>
                </div>
              </motion.div>

              {/* STUDENT SIDE - RIGHT */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-8 md:p-12 relative group cursor-pointer"
                onClick={() => setSelectedType('student')}
              >
                {/* GLOW EFFECT */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                  {/* ICON */}
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <BookOpen className="w-12 h-12 text-white" />
                  </div>

                  {/* TITLE */}
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Student Portal</h2>
                    <p className="text-gray-300">Access courses, assignments & learning tools</p>
                  </div>

                  {/* FEATURES */}
                  <div className="space-y-3 text-left w-full">
                    <div className="flex items-center gap-3 text-gray-200">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>Join and view your classrooms</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-200">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>Submit assignments & track grades</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-200">
                      <div className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span>Access AI-powered learning tools</span>
                    </div>
                  </div>

                  {/* SIGN IN BUTTON */}
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGoogleAuth('student');
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white py-4 rounded-2xl shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 font-semibold group/btn"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#EA4335" d="M24 9.5c3.15 0 5.75 1.1 7.66 2.89l5.7-5.7C33.39 3.21 28.98 1.5 24 1.5 14.84 1.5 7.19 7.84 4.68 16.26l6.95 5.4C13.29 14.75 18.19 9.5 24 9.5z"/>
                      <path fill="#34A853" d="M43.63 20.26H24v7.5h11.4c-1.34 3.58-4.39 6.44-8.4 7.5l6.95 5.4C40.81 36.16 44 30.07 44 24c0-.97-.1-1.92-.27-2.84l-.1-.9z"/>
                      <path fill="#FBBC05" d="M10.38 28.84C9.42 26.65 9 24.38 9 22c0-2.38.42-4.65 1.38-6.84L3.43 9.76C1.26 13.1 0 17.42 0 22s1.26 8.9 3.43 12.24l6.95-5.4z"/>
                      <path fill="#4285F4" d="M24 44.5c6.56 0 12.08-2.16 16.1-5.86l-6.95-5.4c-2.13 1.43-4.86 2.26-8.15 2.26-5.81 0-10.71-5.25-12.37-12.16l-6.95 5.4C7.19 40.16 14.84 44.5 24 44.5z"/>
                    </svg>
                    <span className="flex items-center gap-2">
                      Sign in as Student
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </span>
                  </motion.button>
                </div>
              </motion.div>

            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
