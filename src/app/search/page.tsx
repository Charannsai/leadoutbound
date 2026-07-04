"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadRowSkeleton } from "@/components/common/skeletons";

interface Question {
  key: string;
  question: string;
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

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<"input" | "questions" | "complete" | "scraping">("input");
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  
  const [analyzedQuery, setAnalyzedQuery] = useState<AnalyzedQuery | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const examples = [
    "I want to apply for remote Software Engineer jobs with 2 years experience (I am from India)",
    "Find early-stage AI startups hiring full-stack engineer contractors",
    "Find founders building SaaS products in Europe to pitch my React Native dev services",
  ];

  const handleStartSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      const res = await fetch("/api/search/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      
      if (!res.ok) throw new Error("Failed to analyze query");
      
      const data = await res.json();
      setAnalyzedQuery(data.analyzedQuery);
      
      if (data.isComplete || data.followUpQuestions.length === 0) {
        setStep("complete");
      } else {
        setQuestions(data.followUpQuestions);
        setCurrentQIndex(0);
        setStep("questions");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to connect to the analysis engine. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAnswer.trim()) return;

    const newAnswers = [
      ...answers,
      { question: questions[currentQIndex].question, answer: currentAnswer }
    ];
    setAnswers(newAnswers);
    setCurrentAnswer("");

    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      // Re-evaluate with all answers
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
        
        if (data.isComplete || data.followUpQuestions.length === 0) {
          setStep("complete");
        } else {
          setQuestions(data.followUpQuestions);
          setCurrentQIndex(0);
        }
      } catch (e) {
        console.error(e);
        setErrorMsg("Failed to update query analysis. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleTriggerScraping = async () => {
    setStep("scraping");
    setScrapeProgress("Initializing Apify scrapers...");
    
    try {
      // 1. Create Session
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: analyzedQuery?.role 
            ? `${analyzedQuery.role} Outreach (${analyzedQuery.location || "Remote"})`
            : "Conversational Search Outreach",
          searchQuery: query + (answers.length > 0 ? "\n\nFollow-up Details:\n" + answers.map(a => `- ${a.question}: ${a.answer}`).join("\n") : ""),
          description: `Discovered leads for ${analyzedQuery?.role} matching location: ${analyzedQuery?.location || "Remote"}.`
        }),
      });
      
      if (!sessionRes.ok) throw new Error("Failed to create session");
      const session = await sessionRes.json();
      
      // 2. Trigger scraping route which generates qualified leads
      setScrapeProgress("Connecting with Apify to discover candidates...");
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
      
      setScrapeProgress(`AI qualifying ${scrapeData.count} leads...`);
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
      setErrorMsg("An error occurred during discovery. Moving to session page.");
      // Redirect anyway so the user can inspect the session
      setTimeout(() => router.push("/sessions"), 2000);
    }
  };

  const handleReset = () => {
    setQuery("");
    setAnswers([]);
    setQuestions([]);
    setCurrentQIndex(0);
    setStep("input");
    setErrorMsg("");
    setAnalyzedQuery(null);
  };

  return (
    <div className="min-h-[72vh] flex flex-col justify-center max-w-2xl mx-auto px-4">
      <AnimatePresence mode="wait">
        {step === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full flex flex-col items-center space-y-8"
          >
            {/* Centered logo and subheader */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-surface border border-border shadow-[0_2px_10px_rgba(0,0,0,0.015)]">
                <Search className="w-4.5 h-4.5 text-text-primary" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
                Where should we search for leads?
              </h1>
              <p className="text-xs text-text-secondary max-w-sm">
                Describe your target role, stack, experience, and location preferences in plain language.
              </p>
            </div>

            {/* Centered Pill Search Bar */}
            <form onSubmit={handleStartSearch} className="w-full space-y-4">
              <div className="flex items-center gap-3 pl-6 pr-2.5 py-2.5 rounded-full border border-border bg-surface shadow-[0_4px_30px_rgba(0,0,0,0.01)] focus-within:ring-4 focus-within:ring-accent-500/5 focus-within:border-accent-500 transition-all duration-200">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Designation, tech stack, experience, location..."
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary border-none outline-none focus:outline-none focus:ring-0"
                  style={{ border: "none", outline: "none", boxShadow: "none" }}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 hover:opacity-95 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  {isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-danger-50 text-danger-600 dark:bg-danger-900/10 dark:text-danger-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </form>

            {/* Low-profile Horizontal Suggestions */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-text-tertiary">
              <span className="font-medium text-text-secondary">Try:</span>
              {examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(ex)}
                  className="px-3.5 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-all duration-150 shadow-sm"
                >
                  {ex.split("hiring")[0].trim() || ex}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "questions" && (
          <motion.div
            key="questions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full flex flex-col items-center space-y-6"
          >
            <div className="w-full flex items-center justify-between text-xs text-text-tertiary">
              <span>Clarification Questions</span>
              <span>
                {currentQIndex + 1} of {questions.length}
              </span>
            </div>

            <div className="w-full p-5 rounded-2xl border border-border bg-surface text-center space-y-2">
              <HelpCircle className="w-6 h-6 text-text-secondary mx-auto" />
              <p className="text-sm text-text-primary font-medium">
                {questions[currentQIndex]?.question}
              </p>
            </div>

            <form onSubmit={handleAnswerSubmit} className="w-full space-y-4">
              <div className="flex items-center gap-3 pl-5 pr-2.5 py-2.5 rounded-full border border-border bg-surface shadow-[0_4px_30px_rgba(0,0,0,0.01)] focus-within:ring-4 focus-within:ring-accent-500/5 focus-within:border-accent-500 transition-all duration-200">
                <input
                  type="text"
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary border-none outline-none focus:outline-none focus:ring-0"
                  style={{ border: "none", outline: "none", boxShadow: "none" }}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!currentAnswer.trim() || isLoading}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 hover:opacity-95 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  {isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center px-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
                >
                  Restart Search
                </button>
                <span className="text-xs text-text-tertiary">
                  Press Enter to submit
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
            className="w-full flex flex-col items-center space-y-6"
          >
            <div className="w-full flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-2xl bg-surface-secondary">
              <CheckCircle className="w-8 h-8 text-neutral-800 dark:text-neutral-200 mb-3 animate-bounce" />
              <h3 className="text-sm font-semibold text-text-primary mb-1">
                Target Profile Complete
              </h3>
              <p className="text-xs text-text-secondary text-center max-w-sm">
                We gathered enough variables to configure our Apify target query
                and Gemini qualification profile.
              </p>
            </div>

            {/* Analyzed details */}
            <div className="w-full p-5 rounded-2xl border border-border bg-surface space-y-4">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Configured search parameters
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-text-tertiary">Target Role</span>
                  <p className="font-semibold text-text-primary mt-0.5">
                    {analyzedQuery?.role || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-text-tertiary">Experience required</span>
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
                  <span className="text-text-tertiary">Industry</span>
                  <p className="font-semibold text-text-primary mt-0.5">
                    {analyzedQuery?.industry || "—"}
                  </p>
                </div>
              </div>
            </div>

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
                  Discovering Opportunities
                </h3>
                <p className="text-xs text-text-tertiary mt-1">
                  {scrapeProgress}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                Populating lead pipelines...
              </span>
              <LeadRowSkeleton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
