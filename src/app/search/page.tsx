"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/common/page-header";
import {
  Search,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  ChevronRight,
  Bot,
  User,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadRowSkeleton } from "@/components/common/skeletons";

interface Question {
  key: string;
  question: string;
  options?: string[];
}

interface Answer {
  question: string;
  answer: string;
}

interface AnalyzedQuery {
  role: string | null;
  experience: string | null;
  location: string | null;
  industry: string | null;
  companyType: string | null;
  contactPerson: string | null;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<"input" | "questions" | "complete" | "scraping">("input");
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  
  const [analyzedQuery, setAnalyzedQuery] = useState<AnalyzedQuery | null>(null);
  const [determinedSources, setDeterminedSources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [outboundChannel, setOutboundChannel] = useState<"email" | "linkedin">("email");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  const examples = [
    "I want to find early-stage AI startups looking for full-stack engineers.",
    "Find SaaS founders who may need an internal dashboard.",
    "I want to pitch my AI automation services to healthcare companies.",
    "Find companies that recently raised funding and may be hiring.",
  ];

  const handleStartSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    setErrorMsg("");
    setStep("questions");
    setChatHistory([{ sender: "user", text: query }]);
    
    try {
      const res = await fetch("/api/search/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      
      if (!res.ok) throw new Error("Failed to analyze query");
      
      const data = await res.json();
      setAnalyzedQuery(data.analyzedQuery);
      setDeterminedSources(data.determinedSources || []);
      
      if (data.isComplete || !data.followUpQuestions || data.followUpQuestions.length === 0) {
        setStep("complete");
      } else {
        const nextQ = data.followUpQuestions[0];
        setCurrentQuestion(nextQ);
        setChatHistory(prev => [
          ...prev,
          { sender: "ai", text: nextQ.question }
        ]);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to connect to the analysis engine. Please try again.");
      setStep("input");
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async (ansText: string) => {
    if (!ansText.trim() || !currentQuestion) return;

    const userAnsText = ansText;
    const activeQ = currentQuestion;
    
    // Add to chat history immediately
    setChatHistory(prev => [...prev, { sender: "user", text: userAnsText }]);
    
    const newAnswers = [
      ...answers,
      { question: activeQ.question, answer: userAnsText }
    ];
    setAnswers(newAnswers);
    setCurrentAnswer("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/search/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, answers: newAnswers }),
      });
      
      if (!res.ok) throw new Error("Failed to re-analyze query");
      
      const data = await res.json();
      setAnalyzedQuery(data.analyzedQuery);
      setDeterminedSources(data.determinedSources || []);
      
      if (data.isComplete || !data.followUpQuestions || data.followUpQuestions.length === 0) {
        // AI is satisfied
        setChatHistory(prev => [
          ...prev,
          { sender: "ai", text: "Excellent, I have gathered all the context. Initializing research sources..." }
        ]);
        setTimeout(() => {
          setStep("complete");
        }, 1200);
      } else {
        const nextQ = data.followUpQuestions[0];
        setCurrentQuestion(nextQ);
        setChatHistory(prev => [
          ...prev,
          { sender: "ai", text: nextQ.question }
        ]);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to update query analysis. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submitAnswer(currentAnswer);
  };

  const handleSelectOption = (optText: string) => {
    submitAnswer(optText);
  };

  const handleTriggerScraping = async () => {
    setStep("scraping");
    setScrapeProgress("Initializing AI Research Agent...");
    
    try {
      // 1. Create Session
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: analyzedQuery?.role 
            ? `${analyzedQuery.role} Research (${analyzedQuery.location || "Remote"})`
            : "Conversational Research Session",
          searchQuery: query + (answers.length > 0 ? "\n\nResearch Context:\n" + answers.map(a => `- ${a.question}: ${a.answer}`).join("\n") : ""),
          description: `Conversational lead discovery for ${analyzedQuery?.role || "targets"} in ${analyzedQuery?.industry || "industry"}. Channels: ${determinedSources.join(", ")}.`,
          outboundChannel
        }),
      });
      
      if (!sessionRes.ok) throw new Error("Failed to create session");
      const session = await sessionRes.json();
      
      // 2. Trigger scraping route which generates qualified leads
      setScrapeProgress(`Searching determined channels: ${determinedSources.slice(0, 2).join(" & ")}...`);
      const scrapeRes = await fetch("/api/search/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          analyzedQuery
        })
      });
      
      if (!scrapeRes.ok) throw new Error("Failed to fetch leads");
      const scrapeData = await scrapeRes.json();
      
      setScrapeProgress(`Analyzing and qualifying ${scrapeData.count} discovered opportunities...`);
      // 3. Qualify leads
      await fetch("/api/search/qualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          analyzedQuery
        })
      });
      
      router.push(`/sessions/${session.id}`);
    } catch (e) {
      console.error(e);
      setErrorMsg("An error occurred during discovery. Moving to sessions directory.");
      setTimeout(() => router.push("/sessions"), 2000);
    }
  };

  const handleReset = () => {
    setQuery("");
    setAnswers([]);
    setChatHistory([]);
    setCurrentQuestion(null);
    setStep("input");
    setErrorMsg("");
    setAnalyzedQuery(null);
    setDeterminedSources([]);
  };

  return (
    <div className="min-h-[76vh] flex flex-col justify-center max-w-2xl mx-auto px-4 py-8">
      <AnimatePresence mode="wait">
        {step === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="w-full flex flex-col items-center space-y-8"
          >
            {/* Centered logo and subheader */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-surface border border-border shadow-sm">
                <Sparkles className="w-5 h-5 text-text-primary" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
                Conversational Lead Discovery
              </h1>
              <p className="text-sm text-text-secondary max-w-md">
                Describe your business objective or outreach goal in natural language. Our AI will guide the process.
              </p>
            </div>

            {/* Centered Pill Search Bar */}
            <form onSubmit={handleStartSearch} className="w-full space-y-4">
              <div className="flex items-center gap-3 pl-6 pr-2.5 py-3 rounded-full border border-border bg-surface shadow-sm focus-within:ring-4 focus-within:ring-accent-500/5 focus-within:border-accent-500 transition-all duration-200">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tell the AI who you want to reach out to..."
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary border-none outline-none focus:outline-none focus:ring-0"
                  style={{ border: "none", outline: "none", boxShadow: "none" }}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 hover:opacity-95 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-danger-50 text-danger-600 dark:bg-danger-900/10 dark:text-danger-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </form>

            {/* Low-profile Suggestions */}
            <div className="flex flex-col space-y-2.5 w-full max-w-lg">
              <span className="text-xs font-semibold text-text-tertiary text-center uppercase tracking-wider">Example objectives:</span>
              <div className="grid grid-cols-1 gap-2">
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(ex)}
                    className="p-3 text-left rounded-xl border border-border bg-surface hover:bg-surface-hover text-xs text-text-secondary hover:text-text-primary transition-all shadow-sm"
                  >
                    &ldquo;{ex}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === "questions" && (
          <motion.div
            key="questions"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="w-full flex flex-col h-[70vh] min-h-[450px]"
          >
            {/* Conversation Log Header */}
            <div className="flex justify-between items-center pb-3 border-b border-border text-xs text-text-secondary shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
                <span className="font-semibold text-text-primary">AI Research Agent Refinement</span>
              </div>
              <span>Conversational Mode</span>
            </div>

            {/* Dynamic Chat Log Area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0 pr-1">
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3 max-w-[85%] items-start text-sm",
                    msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border",
                      msg.sender === "user"
                        ? "bg-surface border-border"
                        : "bg-surface border-border text-accent-500"
                    )}
                  >
                    {msg.sender === "user" ? (
                      <User className="w-3.5 h-3.5 text-text-primary" />
                    ) : (
                      <Bot className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "px-4 py-2.5 rounded-2xl leading-relaxed text-xs",
                      msg.sender === "user"
                        ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-950 rounded-tr-none"
                        : "bg-surface border border-border text-text-primary rounded-tl-none"
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 max-w-[80%] items-start text-sm mr-auto">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border bg-surface border-border text-accent-500">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-surface border border-border text-text-tertiary px-4 py-2.5 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin text-text-secondary" />
                    <span>AI is formulating next clarification...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Answer Input Block */}
            <form onSubmit={handleAnswerSubmit} className="pt-3 border-t border-border shrink-0 space-y-3">
              {currentQuestion?.options && currentQuestion.options.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-1.5 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
                  {currentQuestion.options.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSelectOption(opt)}
                      className="px-3.5 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 pl-5 pr-2.5 py-2 rounded-full border border-border bg-surface shadow-sm focus-within:ring-4 focus-within:ring-accent-500/5 focus-within:border-accent-500 transition-all duration-200">
                <input
                  type="text"
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-tertiary border-none outline-none focus:outline-none focus:ring-0"
                  style={{ border: "none", outline: "none", boxShadow: "none" }}
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!currentAnswer.trim() || isLoading}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 hover:opacity-95 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex justify-between items-center px-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
                >
                  Reset Research Session
                </button>
                <span className="text-[10px] text-text-tertiary">
                  Press Enter to send answer
                </span>
              </div>
            </form>
          </motion.div>
        )}

        {step === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col space-y-6"
          >
            <div className="w-full flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-2xl bg-surface-secondary">
              <CheckCircle className="w-8 h-8 text-neutral-800 dark:text-neutral-200 mb-3" />
              <h3 className="text-sm font-semibold text-text-primary mb-1">
                Target Search Objective Clarified
              </h3>
              <p className="text-xs text-text-secondary text-center max-w-sm">
                We successfully refined your search scope. AI will now search public sources automatically.
              </p>
            </div>

            {/* Extracted Details */}
            <div className="w-full p-5 rounded-2xl border border-border bg-surface space-y-4">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Refined search parameters
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-text-tertiary">Target Role</span>
                  <p className="font-semibold text-text-primary mt-0.5">
                    {analyzedQuery?.role || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-text-tertiary">Experience level</span>
                  <p className="font-semibold text-text-primary mt-0.5">
                    {analyzedQuery?.experience || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-text-tertiary">Location preference</span>
                  <p className="font-semibold text-text-primary mt-0.5">
                    {analyzedQuery?.location || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-text-tertiary">Focus Domain</span>
                  <p className="font-semibold text-text-primary mt-0.5">
                    {analyzedQuery?.industry || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Determined sources */}
            {determinedSources.length > 0 && (
              <div className="w-full p-5 rounded-2xl border border-border bg-surface space-y-3">
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-text-tertiary" />
                  Automatically Determined Channels
                </h4>
                <div className="flex flex-wrap gap-2">
                  {determinedSources.map((src, i) => (
                    <span
                      key={i}
                      className="px-3.5 py-1.5 rounded-full border border-border bg-surface-secondary text-xs text-text-primary font-semibold flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-neutral-50 animate-pulse" />
                      {src}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-text-tertiary italic">
                  AI will query and combine listings and databases across these sources.
                </p>
              </div>
            )}

            <div className="w-full flex gap-3 justify-end">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-full text-xs font-medium border border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all"
              >
                Reset Search
              </button>
              <button
                onClick={handleTriggerScraping}
                className="flex items-center gap-1.5 px-4.5 py-2 rounded-full text-xs font-medium bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 hover:opacity-90 transition-all shadow-sm"
              >
                Start Lead Generation
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === "scraping" && (
          <motion.div
            key="scraping"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full mt-8 space-y-6"
          >
            <div className="flex flex-col items-center justify-center p-6 border border-border bg-surface rounded-2xl text-center space-y-3 shadow-sm">
              <RefreshCw className="w-8 h-8 text-neutral-400 dark:text-neutral-500 animate-spin" />
              <div>
                <h3 className="text-sm font-medium text-text-primary">
                  AI Lead Discovery Active
                </h3>
                <p className="text-xs text-text-tertiary mt-1">
                  {scrapeProgress}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                Populating qualified leads...
              </span>
              <LeadRowSkeleton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
