"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { LayoutDashboard, BookOpen, TestTube, Code, Trophy, Wand2, MessageSquare, LogOut, Zap, BarChart3, School, FolderKanban } from "lucide-react";
import { ReactNode, useState } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    signOut({ redirect: true, callbackUrl: "/sign-in" });
  };

  const navLinks = [
    { label: "Dashboard", route: "/dashboard", icon: LayoutDashboard },
    { label: "Classroom", route: "/student/classroom", icon: School },
    { label: "Projects", route: "/student/projects", icon: FolderKanban },
    { label: "Analytics", route: "/analytics", icon: BarChart3 },
    { label: "Magic Learn", route: "/feature-1", icon: Wand2, isMagic: true },
    { label: "AI-Course", route: "/feature-2", icon: BookOpen },
    { label: "Quiz Generator", route: "/feature-3", icon: TestTube },
    { label: "Playground", route: "/feature-4", icon: Zap, isPlayground: true },
    { label: "Leaderboard", route: "/feature-5", icon: Trophy },
    { label: "AskSensei", route: "/ai-mentor", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-[#fafbfc] flex" suppressHydrationWarning>
      {/* Fixed Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-[280px] bg-white border-r border-slate-200 hidden lg:flex flex-col shadow-sm z-50">
        {/* Logo Section */}
        <div className="pt-6 pr-8 pb-5 pl-3 border-b border-slate-200">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-3 group focus:outline-none"
            suppressHydrationWarning
          >
            <div className="relative h-16 w-[237px]">
              <Image
                src="/Main-logo.png"
                alt="PadhaKU Logo"
                fill
                className="object-contain text-transparent"
              />
            </div>

          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          <div className="space-y-1">
            {navLinks.map((item, idx) => {
              const isActive = pathname === item.route;
              const Icon = item.icon;
              
              return (
                <button
                  key={idx}
                  onClick={() => router.push(item.route)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 focus:outline-none ${
                    item.isMagic && isActive
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
                      : item.isMagic
                      ? 'text-slate-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50'
                      : item.isPlayground && isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                      : item.isPlayground
                      ? 'text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50'
                      : isActive
                      ? 'bg-[#387BFF] text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  suppressHydrationWarning
                >
                  <Icon className={`w-5 h-5 ${isActive || item.isMagic && isActive || item.isPlayground && isActive ? '' : 'text-slate-500'}`} />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-slate-200">
          <div className="px-4 py-4">
            <div className="relative">
              <button
                onClick={() => setShowLogout(!showLogout)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none"
                suppressHydrationWarning
              >
                {session?.user?.image ? (
                  <div className="relative">
                    <Image 
                      src={session.user.image} 
                      alt="Profile" 
                      width={40} 
                      height={40} 
                      className="rounded-full"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#444fd6] flex items-center justify-center text-white font-bold">
                    {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {session?.user?.name || 'User'}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {session?.user?.email || 'user@example.com'}
                  </div>
                </div>
              </button>

              {/* Logout Dropdown */}
              {showLogout && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors focus:outline-none"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content - with left margin to account for fixed sidebar */}
      <main className="flex-1ml-[280px] lg:ml-[280px]">{children}</main>
    </div>
  );
} 