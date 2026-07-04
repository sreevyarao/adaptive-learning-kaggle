"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default function Quiz() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [iteration, setIteration] = useState(0);
  const [report, setReport] = useState<string>("");
  const router = useRouter();

  const getSafeJSON = (key: string, defaultVal: string = "{}") => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : JSON.parse(defaultVal);
    } catch (e) {
      return JSON.parse(defaultVal);
    }
  };

  const fetchQuestions = async () => {
    setIsGenerating(true);
    const preRequisites = getSafeJSON("preRequisites");
    const userState = getSafeJSON("userState");
    const pastAnswers = getSafeJSON("quizAnswers");

    try {
      const res = await fetch("http://localhost:8000/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preRequisites, userState, pastAnswers, iteration }),
      });
      const data = await res.json();
      const state = data.result;

      if (state.is_satisfied || iteration > 5) {
        // - [x] Overhaul `Sidebar.tsx`: Add glassmorphism (`backdrop-blur-xl`), active states, and hover animations.
        // - [x] Overhaul `onboarding/page.tsx`: Implement gradient chat bubbles, slide-in animations, and a floating command bar.
        // - [x] Overhaul `quiz/page.tsx`: Style question boxes as glassmorphic cards with glowing interactive options.
        // - [x] Overhaul `page.tsx` (Dashboard): Upgrade the empty state with playful animations, and style the roadmap/assets in premium floating panels.
        localStorage.setItem("diagnosisReport", state.diagnosis_report);
        await generateFinalRoadmap(state.diagnosis_report);
      } else {
        setQuestions(state.questions || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFinalRoadmap = async (report: string) => {
    setIsGenerating(true);
    const userState = getSafeJSON("userState");
    const initialDraft = getSafeJSON("initialDraft");
    const pastAnswers = getSafeJSON("quizAnswers");

    try {
      const res = await fetch("http://localhost:8000/api/final_roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userState, initialDraft, report, pastAnswers }),
      });
      const data = await res.json();
      
      const username = localStorage.getItem("mockUser");
      if (username) {
        await fetch("http://localhost:8000/api/save_roadmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            roadmap_markdown: data.final_roadmap.roadmap_markdown || data.final_roadmap,
            learning_assets: data.assets
          })
        });
      }

      localStorage.setItem("finalRoadmap", JSON.stringify(data.final_roadmap));
      localStorage.setItem("assets", JSON.stringify(data.assets));
      router.push("/");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Process answers to fill in blanks
    const processedAnswers: Record<number, string> = {};
    questions.forEach((q, idx) => {
      const ans = answers[idx]?.trim();
      processedAnswers[idx] = ans ? ans : "User does not know";
    });

    const existing = getSafeJSON("quizAnswers");
    const combined = { ...existing, [`iter_${iteration}`]: processedAnswers };
    localStorage.setItem("quizAnswers", JSON.stringify(combined));
    setAnswers({});
    setIteration(i => i + 1);
    fetchQuestions(); // fetch next batch
  };

  return (
    <div className="flex flex-col min-h-screen max-w-4xl mx-auto p-4 md:p-8 text-gray-100 font-sans">
      <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 drop-shadow-sm mb-2">
          Knowledge Diagnosis
        </h1>
        <p className="text-gray-400 font-medium">Let's find out exactly where you stand.</p>
      </div>
      
      {isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
            <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-emerald-400 relative z-10"></div>
          </div>
          <p className="text-2xl text-emerald-100 font-semibold drop-shadow-md">Analyzing answers & calibrating next questions...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8 pb-12">
          {questions.map((q, idx) => (
            <div key={idx} className="bg-gray-900/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-800/60 transform transition-all duration-300 hover:shadow-emerald-900/20 hover:border-emerald-500/30 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 100}ms` }}>
              <h3 className="text-xl md:text-2xl font-bold mb-6 flex gap-4 text-gray-100 items-start">
                <span className="bg-gradient-to-br from-emerald-400 to-teal-500 text-gray-900 w-10 h-10 flex items-center justify-center rounded-xl shrink-0 shadow-lg font-black text-lg">
                  {idx + 1}
                </span>
                <div className="prose prose-invert prose-emerald max-w-none pt-1">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {q.question_text}
                  </ReactMarkdown>
                </div>
              </h3>
              
              {q.question_type === 'mcq' && q.options ? (
                <div className="space-y-3 ml-0 md:ml-14">
                  {q.options.map((opt: string, oIdx: number) => {
                    const isSelected = answers[idx] === opt;
                    return (
                      <label key={oIdx} className={`flex items-center space-x-4 cursor-pointer p-4 rounded-2xl transition-all duration-200 border ${
                        isSelected 
                          ? 'bg-emerald-900/30 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                          : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800 hover:border-gray-600'
                      }`}>
                        <input 
                          type="radio" 
                          name={`q_${idx}`} 
                          value={opt}
                          checked={isSelected}
                          onChange={(e) => setAnswers({...answers, [idx]: e.target.value})}
                          className="form-radio text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900 h-6 w-6 transition-all"
                        />
                        <span className={`text-lg transition-colors duration-200 ${isSelected ? 'text-emerald-100 font-medium' : 'text-gray-300'}`}>
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="ml-0 md:ml-14 mt-4">
                  <textarea
                    rows={4}
                    value={answers[idx] || ""}
                    onChange={(e) => setAnswers({...answers, [idx]: e.target.value})}
                    placeholder="Type your detailed answer here... (leave blank if you do not know)"
                    className="w-full p-5 rounded-2xl bg-gray-800/50 border border-gray-700/50 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:bg-gray-800 transition-all resize-none shadow-inner text-lg"
                  />
                </div>
              )}
            </div>
          ))}
          
          <div className="flex justify-end pt-8">
            <button 
              type="submit" 
              className="group relative px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xl rounded-2xl font-bold shadow-xl hover:shadow-emerald-500/30 transition-all transform hover:scale-[1.02] active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
              <span className="relative flex items-center gap-2">
                Submit & Continue
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
