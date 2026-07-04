"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

export default function Onboarding() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isFreezing, setIsFreezing] = useState(false);
  
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);

  const [isUpdateMode, setIsUpdateMode] = useState(false);

  useEffect(() => {
    // Clean up old state without deleting the auth token
    localStorage.removeItem("userState");
    localStorage.removeItem("preRequisites");
    localStorage.removeItem("initialDraft");
    localStorage.removeItem("quizAnswers");
    
    if (typeof window !== "undefined") {
      const mode = new URLSearchParams(window.location.search).get("mode");
      if (mode === "update") {
        setIsUpdateMode(true);
      }
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleEndChat = async (userState: any, preRequisites: any) => {
    localStorage.setItem("userState", JSON.stringify(userState));
    localStorage.setItem("preRequisites", JSON.stringify(preRequisites));
    
    // Save to backend SQLite DB
    const username = localStorage.getItem("mockUser");
    if (username) {
      await fetch("http://localhost:8000/api/save_state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          user_state: userState,
          pre_requisites: preRequisites
        })
      });
    }

    router.push("/quiz");
  };

  // Handle custom submit to check for state
  const customSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input || !input.trim()) return;

    // Add user message optimistically
    const newMessages: Message[] = [...messages, { id: Date.now().toString(), role: "user", content: input }];
    setMessages(newMessages);
    setInput("");

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, mode: isUpdateMode ? "update" : "onboarding" }),
      });
      const data = await res.json();
      
      const assistantMsg: Message = { id: Date.now().toString(), role: "assistant", content: data.content };
      setMessages([...newMessages, assistantMsg]);

      if (data.state && data.state.is_complete) {
        setIsFreezing(true);
        const username = localStorage.getItem("mockUser");
        
        if (isUpdateMode && username) {
          // If we are updating, skip the quiz and directly update the roadmap!
          const updateRes = await fetch("http://localhost:8000/api/update_roadmap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, new_goals_state: data.state }),
          });
          
          if (updateRes.ok) {
            router.push("/");
          } else {
            console.error("Failed to update roadmap");
            setIsFreezing(false);
          }
        } else {
          // Start standard curriculum generation for new users
          const curRes = await fetch("http://localhost:8000/api/curriculum", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data.state),
          });
          const curData = await curRes.json();
          
          // Save to local storage for the quiz page
          localStorage.setItem("userState", JSON.stringify(data.state));
          localStorage.setItem("initialDraft", JSON.stringify(curData.result.draft));
          
          await handleEndChat(data.state, curData.result.pre_requisites);
        }
      }

    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 md:p-8 text-gray-100 font-sans">
      <div className="text-center mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 drop-shadow-sm mb-2">
          Personalized Onboarding
        </h1>
        <p className="text-gray-400 font-medium">Let's craft your unique learning journey.</p>
      </div>
      
      <div className="flex-1 overflow-y-auto mb-6 rounded-3xl p-6 bg-gray-900/40 backdrop-blur-xl shadow-2xl border border-gray-800/60 space-y-6 custom-scrollbar relative">
        {messages.map((m, i) => (
          <div key={m.id} className={`flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both ${m.role === 'user' ? 'items-end' : 'items-start'}`} style={{ animationDelay: `${i * 100}ms` }}>
            <div className={`px-6 py-4 rounded-2xl max-w-[85%] shadow-lg ${m.role === 'user' ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm' : 'bg-gray-800/80 backdrop-blur-md text-gray-200 border border-gray-700/50 rounded-bl-sm'}`}>
              <span className="text-[10px] opacity-60 mb-2 block uppercase font-black tracking-widest">{m.role === 'user' ? 'You' : 'AI Assistant'}</span>
              <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-gray-900/50 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isFreezing && (
          <div className="flex justify-center my-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-300 px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.1)] font-semibold flex items-center gap-4 backdrop-blur-md">
              <svg className="animate-spin h-6 w-6 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="animate-pulse">Analyzing your profile & drafting curriculum...</span>
            </div>
          </div>
        )}
        <div ref={endRef} className="h-4" />
      </div>

      <form onSubmit={customSubmit} className="relative group z-20">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex gap-2 bg-gray-900/80 backdrop-blur-xl p-2 rounded-3xl border border-gray-700/50 shadow-2xl">
          <input
            value={input}
            onChange={handleInputChange}
            disabled={isFreezing}
            placeholder="Type your message..."
            className="w-full py-4 px-6 bg-transparent text-white placeholder-gray-500 focus:outline-none disabled:opacity-50 text-lg"
          />
          <button 
            type="submit" 
            disabled={isFreezing}
            className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-95"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
