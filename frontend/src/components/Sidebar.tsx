"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if mock user is saved
    const user = localStorage.getItem("mockUser");
    setIsAuthenticated(!!user);
  }, [pathname]);

  const handleSignOut = () => {
    localStorage.removeItem("mockUser");
    localStorage.removeItem("finalRoadmap");
    localStorage.removeItem("assets");
    localStorage.removeItem("userState");
    localStorage.removeItem("initialDraft");
    localStorage.removeItem("preRequisites");
    localStorage.removeItem("quizAnswers");
    setIsAuthenticated(false);
    router.push("/");
  };

  const navItems = [
    { name: "Workspace", href: "/", icon: "🏠" },
    { name: "Onboarding", href: "/onboarding", icon: "✨" },
    { name: "Knowledge", href: "/knowledge", icon: "🕸️" },
    { name: "Flashcards", href: "/flashcards", icon: "🧠" },
    { name: "Pomodoro", href: "/pomodoro", icon: "⏱️" },
  ];

  return (
    <aside className="w-64 bg-gray-900/40 backdrop-blur-2xl border-r border-gray-800/60 h-screen flex flex-col print:hidden shadow-2xl relative z-10">
      <div className="p-8">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 via-blue-400 to-emerald-400 drop-shadow-sm tracking-tight">
          Adaptive
          <br />Learning
        </h2>
      </div>

      <nav className="flex-1 px-4 space-y-3 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-semibold group relative overflow-hidden ${
                isActive
                  ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/10 text-blue-300 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                  : "text-gray-400 hover:text-gray-100 hover:bg-gray-800/50 hover:border-gray-700/50 border border-transparent"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              )}
              <span className={`text-xl transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110 group-hover:-rotate-3'}`}>
                {item.icon}
              </span>
              <span className="tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-gray-800/50 bg-gray-900/20">
        {isAuthenticated ? (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-red-400 hover:text-white hover:bg-red-500/20 border border-transparent hover:border-red-500/30 rounded-2xl transition-all duration-300 group"
          >
            <span className="group-hover:rotate-12 transition-transform">👋</span> Sign Out
          </button>
        ) : (
          <div className="text-center text-sm text-gray-500 font-medium px-4 py-3 rounded-2xl bg-gray-800/30 border border-gray-800">
            Not authenticated
          </div>
        )}
      </div>
    </aside>
  );
}
