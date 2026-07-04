"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";

export default function Workspace() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [assets, setAssets] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const router = useRouter();

  // Mock Login state
  const [username, setUsername] = useState("");

  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem("mockUser");
    if (user) {
      setIsAuthenticated(true);
      fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user })
      }).then(res => res.json()).then(data => {
        if (data.user) {
          if (data.user.roadmap_markdown) {
            setRoadmap({ roadmap_markdown: data.user.roadmap_markdown });
            // Initialize Knowledge Graph in background
            fetch("http://localhost:8000/api/kg/init", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: user, roadmap_markdown: data.user.roadmap_markdown })
            }).catch(console.error);
          }
          if (data.user.learning_assets) setAssets(data.user.learning_assets);
        }
        setIsLoadingData(false);
      }).catch(err => {
        console.error(err);
        setIsLoadingData(false);
      });
    } else {
      setIsAuthenticated(false);
      setIsLoadingData(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      setIsLoadingData(true);
      const res = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      
      localStorage.setItem("mockUser", username);
      window.dispatchEvent(new Event("auth-change"));
      setIsAuthenticated(true);
      
      if (data.user) {
        if (data.user.roadmap_markdown) {
          setRoadmap({ roadmap_markdown: data.user.roadmap_markdown });
          // Initialize Knowledge Graph in background
          fetch("http://localhost:8000/api/kg/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, roadmap_markdown: data.user.roadmap_markdown })
          }).catch(console.error);
        }
        if (data.user.learning_assets) setAssets(data.user.learning_assets);
      }
      setIsLoadingData(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!roadmap) return;
    setIsDownloading(true);
    
    try {
      const res = await fetch("http://localhost:8000/api/download_pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown_text: roadmap.roadmap_markdown })
      });
      
      if (!res.ok) throw new Error("Failed to generate PDF");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "My_Learning_Roadmap.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF. Check the backend server.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isAuthenticated === null) return <div className="p-8">Loading...</div>;

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center p-4 bg-gray-900 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="bg-gray-900/60 backdrop-blur-2xl p-10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-gray-700/50 w-full max-w-md text-center relative z-10 animate-in zoom-in duration-700">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl rotate-12 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-4xl -rotate-12">🎓</span>
          </div>
          <h1 className="text-4xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Welcome Back</h1>
          <p className="text-gray-400 mb-8 font-medium">Please sign in to access your learning workspace.</p>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <input 
                type="text" 
                placeholder="Enter your username..." 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="relative w-full p-4 rounded-2xl border border-gray-700 bg-gray-900/80 text-white focus:outline-none focus:border-blue-500 transition-all text-lg"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold shadow-xl hover:shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-95 text-lg"
            >
              Enter Workspace
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="bg-gray-900/40 backdrop-blur-xl p-12 rounded-3xl shadow-2xl border border-gray-800/60 w-full max-w-2xl text-center space-y-8 animate-in slide-in-from-bottom-8 duration-700">
          <div className="text-8xl mb-6 animate-bounce drop-shadow-2xl">🚀</div>
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Your Workspace is Empty</h2>
          <p className="text-gray-400 text-xl font-medium leading-relaxed max-w-lg mx-auto">
            It looks like you haven't generated a personalized learning roadmap yet. Let's build your custom curriculum!
          </p>
          <button 
            onClick={() => router.push("/onboarding")}
            className="px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-full font-bold text-xl shadow-xl hover:shadow-emerald-500/30 transition-all transform hover:scale-105 active:scale-95 group"
          >
            Start Onboarding
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-900 to-gray-900 pointer-events-none"></div>
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
      
      <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 text-gray-100 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-900/60 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-gray-800/60 print:hidden relative overflow-hidden gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]"></div>
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 tracking-tight">
            Your Personalized Workspace
          </h1>
          <p className="text-gray-400 mt-3 text-lg font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Customized based on your goals and diagnosis
          </p>
        </div>
        <div className="flex gap-4 z-10">
          <button 
            onClick={() => router.push("/onboarding?mode=update")}
            className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-emerald-400 rounded-2xl font-bold shadow-lg border border-gray-700 hover:border-gray-600 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Update Roadmap
          </button>
          <button 
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="relative group px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-bold shadow-lg border border-gray-700 hover:border-gray-600 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:transform-none overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-emerald-600/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500"></div>
            <span className="relative flex items-center gap-3">
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF
                </>
              )}
            </span>
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8 print:block" id="roadmap-content">
        <div className="lg:col-span-2 space-y-6 print:col-span-3">
          <section className="bg-gray-900/40 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-2xl border border-gray-800/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full blur-2xl"></div>
            <h2 className="text-3xl font-black text-white mb-8 flex items-center gap-4 border-b border-gray-800/50 pb-6">
              <span className="text-emerald-400 bg-emerald-400/10 p-3 rounded-xl">🗺️</span> 
              The Roadmap
            </h2>
            <div className="prose prose-invert prose-emerald max-w-none prose-h2:text-3xl prose-h2:font-black prose-h3:text-2xl prose-h3:text-emerald-300 prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline prose-li:marker:text-emerald-500 prose-code:bg-gray-800 prose-code:text-emerald-200 prose-code:px-1 prose-code:rounded">
              <ReactMarkdown>
                {roadmap.roadmap_markdown || "No roadmap markdown provided."}
              </ReactMarkdown>
            </div>
          </section>
        </div>

        <div className="space-y-6 print:hidden">
          <section className="bg-gray-900/40 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-800/60 sticky top-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-br-full blur-2xl"></div>
            <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-4 border-b border-gray-800/50 pb-6">
              <span className="text-blue-400 bg-blue-400/10 p-3 rounded-xl">📚</span>
              Learning Content
            </h2>
            <div className="space-y-4">
              {assets && typeof assets === 'string' ? (
                <pre className="text-sm text-gray-300 bg-gray-900/80 p-5 rounded-2xl overflow-x-auto border border-gray-700/50 shadow-inner custom-scrollbar">
                  {assets}
                </pre>
              ) : assets ? (
                <div className="text-sm text-gray-300 prose prose-invert prose-sm">
                  <ReactMarkdown>
                    {JSON.stringify(assets, null, 2)}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-gray-500 italic bg-gray-800/30 p-4 rounded-xl border border-gray-800 text-center">No additional learning content available.</p>
              )}
            </div>
          </section>
        </div>
      </div>
      </div>
    </div>
  );
}
