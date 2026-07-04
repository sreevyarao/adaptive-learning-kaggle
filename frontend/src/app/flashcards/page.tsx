"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

export default function Flashcards() {
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionState, setSessionState] = useState<"welcome" | "loading" | "active" | "complete">("welcome");
  const router = useRouter();

  // Remove auto-fetch on mount, wait for user to click start
  useEffect(() => {
    // Optional: check auth
  }, []);

  const handleStartSession = async () => {
    const user = localStorage.getItem("mockUser");
    if (!user) {
      router.push("/");
      return;
    }
    setSessionState("loading");
    try {
      const res = await fetch("http://localhost:8000/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user })
      });
      const data = await res.json();
      if (data.status === "success" && data.cards && data.cards.length > 0) {
        setCards(data.cards);
        setSessionState("active");
      } else {
        setSessionState("complete");
      }
    } catch (e) {
      console.error(e);
      setSessionState("welcome");
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;
    
    setIsSubmitting(true);
    const user = localStorage.getItem("mockUser");
    try {
      const res = await fetch("http://localhost:8000/api/flashcards/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user,
          flashcard: cards[currentIndex],
          user_answer: userAnswer
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setEvaluation(data.evaluation);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    const newCards = [...cards];
    newCards.splice(currentIndex, 1);
    setCards(newCards);
    setEvaluation(null);
    setUserAnswer("");
    savePending(newCards);
  };

  const savePending = (remainingCards: any[]) => {
    const user = localStorage.getItem("mockUser");
    fetch("http://localhost:8000/api/flashcards/save_pending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user,
        pending_flashcards: remainingCards
      })
    }).catch(console.error);
  };

  const handleQuit = () => {
    savePending(cards);
    router.push("/");
  };

  if (sessionState === "welcome") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-gray-900 to-gray-900"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center max-w-lg text-center animate-in fade-in zoom-in-95 duration-1000">
          <div className="w-24 h-24 mb-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 p-[2px] shadow-[0_0_50px_rgba(59,130,246,0.3)] animate-pulse">
            <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center text-4xl">
              🧠
            </div>
          </div>
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 mb-6 drop-shadow-sm">
            Spaced Repetition
          </h1>
          <p className="text-gray-300 text-lg mb-10 leading-relaxed font-medium">
            Test your mastery with up to 50 smart flashcards, dynamically generated based on your weak points and learning history.
          </p>
          <button 
            onClick={handleStartSession}
            className="group relative px-10 py-5 bg-gray-900 text-white rounded-2xl font-bold overflow-hidden shadow-2xl transition-all transform hover:scale-105 active:scale-95 border border-gray-700 hover:border-gray-500"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="relative z-10 flex items-center gap-3 text-xl tracking-wide">
              Start Session
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </button>
          
          <button onClick={() => router.push("/")} className="mt-8 text-gray-500 hover:text-gray-300 transition-colors font-medium">
            Return to Workspace
          </button>
        </div>
      </div>
    );
  }

  if (sessionState === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-gray-900 to-gray-900"></div>
        <div className="relative z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 animate-pulse">
            Curating your tailored session...
          </div>
        </div>
      </div>
    );
  }

  if (sessionState === "complete" || cards.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-900 text-white gap-6 relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-gray-900 to-gray-900"></div>
        <div className="relative z-10 text-center animate-in fade-in zoom-in-95 duration-700">
          <div className="text-7xl mb-8 animate-bounce">🎉</div>
          <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mb-6 drop-shadow-sm">
            All caught up!
          </h2>
          <p className="text-gray-300 text-lg mb-10 font-medium max-w-md mx-auto">
            You have completed your spaced repetition session. Great job reinforcing your knowledge!
          </p>
          <button onClick={() => router.push("/")} className="px-8 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-xl text-emerald-400">
            Return to Workspace
          </button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col p-4 md:p-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-900 to-gray-900"></div>
      
      <header className="relative z-10 flex justify-between items-center mb-10 bg-gray-800/50 backdrop-blur-md p-4 rounded-2xl border border-gray-700">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 flex items-center gap-2">
          <span>🧠</span> Smart Flashcards
        </h1>
        <div className="flex items-center gap-6">
          <span className="text-gray-400 font-medium">{cards.length} cards remaining</span>
          <button onClick={handleQuit} className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all text-sm font-bold">
            Quit Early
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
        <div className="w-full bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 md:p-12 shadow-2xl animate-in zoom-in-95 duration-500">
          <div className="inline-block px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-sm font-bold mb-6 border border-blue-500/20">
            Topic: {currentCard.topic}
          </div>
          
          <h2 className="text-2xl md:text-3xl font-medium text-gray-100 leading-relaxed mb-10">
            {currentCard.question}
          </h2>

          {!evaluation ? (
            <form onSubmit={handleEvaluate} className="space-y-6">
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer here to test your understanding..."
                className="w-full h-40 bg-gray-900/80 border border-gray-700 rounded-2xl p-5 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-lg"
                autoFocus
              />
              <button 
                type="submit" 
                disabled={isSubmitting || !userAnswer.trim()}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-95 text-lg"
              >
                {isSubmitting ? "Evaluating..." : "Check Answer"}
              </button>
            </form>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className={`p-6 rounded-2xl border ${evaluation.is_correct ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{evaluation.is_correct ? '✅' : '💡'}</span>
                  <h3 className={`text-xl font-bold ${evaluation.is_correct ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {evaluation.is_correct ? 'Correct!' : 'Not quite right'}
                  </h3>
                </div>
                <p className="text-gray-300 text-lg leading-relaxed">{evaluation.feedback}</p>
              </div>
              
              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700/50">
                <h4 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">Expected Answer</h4>
                <p className="text-gray-300 italic">{currentCard.expected_answer}</p>
              </div>

              <button 
                onClick={handleNext}
                className="w-full py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-2xl font-bold shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 text-lg flex items-center justify-center gap-2"
              >
                Next Flashcard <span>→</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
