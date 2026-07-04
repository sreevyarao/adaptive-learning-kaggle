"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

type Phase = "focus" | "recall" | "insights";

export default function Pomodoro() {
  const [phase, setPhase] = useState<Phase>("focus");
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins
  const [isActive, setIsActive] = useState(false);
  const [recallText, setRecallText] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      if (phase === "focus") {
        setPhase("recall");
        setTimeLeft(3 * 60); // 3 mins recall
      } else if (phase === "recall") {
        setIsActive(false);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, phase]);

  const toggleTimer = () => setIsActive(!isActive);

  const skipToRecall = () => {
    setIsActive(true);
    setPhase("recall");
    setTimeLeft(3 * 60);
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recallText.trim()) return;
    
    setIsActive(false);
    setIsEvaluating(true);
    const user = localStorage.getItem("mockUser");
    try {
      const res = await fetch("http://localhost:8000/api/pomodoro/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user,
          recall_text: recallText
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setEvaluation(data.evaluation);
        setPhase("insights");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluating(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const renderTimer = () => (
    <div className="flex flex-col items-center animate-in zoom-in-95 duration-500">
      <h2 className="text-3xl font-bold text-gray-300 mb-8">
        {phase === "focus" ? "Deep Focus Session" : "Recall Session"}
      </h2>
      
      <div className={`text-9xl font-black tabular-nums tracking-tighter mb-12 drop-shadow-2xl ${phase === 'focus' ? 'text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-indigo-600' : 'text-transparent bg-clip-text bg-gradient-to-b from-emerald-400 to-teal-600'}`}>
        {formatTime(timeLeft)}
      </div>

      {phase === "focus" && (
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleTimer}
            className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full font-bold text-xl shadow-xl hover:shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95"
          >
            {isActive ? "Pause Focus" : "Start Focus"}
          </button>
          
          <button 
            onClick={skipToRecall}
            className="px-6 py-5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full font-bold shadow-lg border border-gray-700 transition-all transform hover:scale-105 active:scale-95"
          >
            Skip (Dev Mode)
          </button>
        </div>
      )}

      {phase === "recall" && (
        <form onSubmit={handleEvaluate} className="w-full max-w-3xl mt-8 animate-in slide-in-from-bottom-8 duration-700">
          <div className="bg-gray-800/50 backdrop-blur-md border border-emerald-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full blur-2xl"></div>
            <p className="text-emerald-300 mb-4 font-medium flex items-center gap-2">
              <span>🧠</span> Write down everything you learned or remember from the last 25 minutes. No peeking!
            </p>
            <textarea
              value={recallText}
              onChange={(e) => setRecallText(e.target.value)}
              placeholder="I learned about..."
              className="w-full h-48 bg-gray-900 border border-gray-700 rounded-2xl p-5 text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none text-lg mb-6 relative z-10"
              autoFocus
            />
            <button 
              type="submit" 
              disabled={isEvaluating || !recallText.trim()}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-95 text-lg relative z-10"
            >
              {isEvaluating ? "Analyzing Knowledge..." : "Submit Recall"}
            </button>
          </div>
        </form>
      )}
    </div>
  );

  const renderInsights = () => (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">✨</div>
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Recall Insights</h2>
        <p className="text-gray-400 text-lg mt-2">Your Knowledge Graph has been updated based on what you remembered.</p>
      </div>

      <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <div className="prose prose-invert prose-emerald max-w-none prose-h3:text-2xl prose-h3:text-emerald-300">
          <ReactMarkdown>
            {evaluation.feedback_markdown}
          </ReactMarkdown>
        </div>
      </div>

      {Object.keys(evaluation.mastery_updates).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(evaluation.mastery_updates).map(([topic, change]) => (
            <div key={topic} className="bg-gray-800/40 border border-gray-700/50 p-6 rounded-2xl flex items-center justify-between">
              <span className="font-bold text-gray-200">{topic}</span>
              <span className={`px-3 py-1 rounded-full font-bold text-sm ${Number(change) > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                {Number(change) > 0 ? '+' : ''}{Number(change)} Mastery
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center pt-8">
        <button 
          onClick={() => {
            setPhase("focus");
            setTimeLeft(25 * 60);
            setRecallText("");
            setEvaluation(null);
          }}
          className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-2xl font-bold shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 text-lg"
        >
          Start Another Session
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col p-4 md:p-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-gray-900 to-gray-900 pointer-events-none"></div>
      
      <header className="relative z-10 flex justify-between items-center mb-10 bg-gray-800/30 backdrop-blur-md p-4 rounded-2xl border border-gray-700/50">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center gap-2">
          <span>⏱️</span> Pomodoro Recall
        </h1>
        <button onClick={() => router.push("/")} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition-all text-sm font-bold">
          Back to Workspace
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full">
        {phase === "insights" ? renderInsights() : renderTimer()}
      </main>
    </div>
  );
}
