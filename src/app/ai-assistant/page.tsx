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
  Inbox,
  Volume2,
  Mic
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function AIAssistantPage() {
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
    "I want to find early-stage SaaS startups in San Francisco looking for Full-stack Engineers.",
    "Find AI/ML founders in London who might need backend consulting services.",
    "Search for HR managers at tech companies with over 500 employees in Europe.",
    "I want to pitch my content design services to fintech marketing directors."
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
        setChatHistory(prev => [
          ...prev,
          { sender: "ai", text: "Excellent, I have gathered all the context. Ready to start B2B database discovery." }
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

  const handleTriggerScraping = async () => {
    setStep("scraping");
    setScrapeProgress("Initializing Apollo AI Scraping Agent...");
    
    try {
      // 1. Create Session (Sequence)
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: analyzedQuery?.role 
            ? `${analyzedQuery.role} Outreach Campaign (${analyzedQuery.location || "Remote"})`
            : "AI Discover Campaign",
          searchQuery: query + (answers.length > 0 ? "\n\nTarget Context:\n" + answers.map(a => `- ${a.question}: ${a.answer}`).join("\n") : ""),
          description: `AI-generated leads sequence for ${analyzedQuery?.role || "targets"} in ${analyzedQuery?.industry || "industry"}.`,
          outboundChannel
        }),
      });
      
      if (!sessionRes.ok) throw new Error("Failed to create sequence");
      const session = await sessionRes.json();
      
      // Initialize sequence steps automatically
      await fetch(`/api/sequences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_steps",
          sessionId: session.id,
          steps: [
            { type: "email_auto", delayDays: 0, subject: `Outreach to {{companyName}}`, body: `Hi {{contactName}},\n\nI noticed you are based in {{location}} and scaling operations at {{companyName}}.\n\nWould love to discuss how our solutions fit your needs.\n\nBest,\nCharan` },
            { type: "linkedin_connect", delayDays: 2, instructions: `Send connection request to {{contactName}}` }
          ]
        })
      });
      
      // 2. Trigger scraping route which generates qualified leads
      setScrapeProgress(`Scanning B2B datasets and channels...`);
      const scrapeRes = await fetch("/api/search/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          analyzedQuery,
          determinedSources
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
      
      router.push(`/sequences/${session.id}`);
    } catch (e) {
      console.error(e);
      setErrorMsg("An error occurred during discovery. Redirecting to sequences.");
      setTimeout(() => router.push("/sequences"), 2000);
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-500/20 text-accent-500 flex items-center justify-center">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Apollo AI Assistant</h1>
          <p className="text-xs text-text-secondary">Describe your target lead profile and let AI scrape, enrich, and build your pipeline.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Conversation Pane */}
        <div className="lg:col-span-2 flex flex-col h-[550px] bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-border bg-surface-secondary flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent-500" />
              Outbound Discovery Copilot
            </span>
            <span className="text-[10px] text-text-tertiary px-2 py-0.5 bg-surface-tertiary rounded-full border border-border">
              3 CHATS LEFT
            </span>
          </div>

          {/* Message Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center px-6">
                <Bot className="w-12 h-12 text-accent-500/30 mb-4" />
                <h3 className="text-sm font-semibold text-text-primary mb-1">How can I help you prospect today?</h3>
                <p className="text-xs text-text-tertiary max-w-sm">
                  Tell me the exact roles, locations, technologies, and company sizes you want to search. E.g.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2 w-full max-w-md">
                  {examples.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(ex)}
                      className="text-left p-2.5 bg-surface-secondary border border-border rounded-xl text-[11px] text-text-secondary hover:bg-surface-hover hover:border-accent-500/30 transition-all cursor-pointer"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-3 max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed",
                      msg.sender === "user"
                        ? "ml-auto bg-accent-500 text-white rounded-tr-none"
                        : "mr-auto bg-surface-secondary border border-border text-text-primary rounded-tl-none"
                    )}
                  >
                    {msg.sender === "ai" && (
                      <div className="w-6 h-6 rounded-full bg-accent-500/10 text-accent-500 flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div>
                      <p>{msg.text}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-text-tertiary text-xs mr-auto bg-surface-secondary border border-border rounded-2xl rounded-tl-none p-3 max-w-[80%]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent-500" />
                    <span>Analyzing criteria details...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Form Input Area */}
          <div className="p-3 border-t border-border bg-surface-secondary">
            {step === "input" ? (
              <form onSubmit={handleStartSearch} className="flex gap-2 relative">
                <input
                  type="text"
                  placeholder="Ask AI to find prospects or describe your ICP..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-surface pl-3 pr-20 py-2.5 rounded-xl border border-border text-xs focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-accent-500 hover:bg-accent-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : step === "questions" && currentQuestion ? (
              <form onSubmit={handleAnswerSubmit} className="space-y-3">
                <div className="p-2.5 bg-surface border border-border rounded-xl">
                  <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Select or Write Answer</p>
                  {currentQuestion.options ? (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {currentQuestion.options.map((opt) => (
                        <button
                          type="button"
                          key={opt}
                          onClick={() => handleSelectOption(opt)}
                          className="px-2.5 py-1 bg-surface-secondary hover:bg-accent-500 hover:text-white border border-border hover:border-accent-500 rounded-lg text-xs transition-all cursor-pointer"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your response..."
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      className="flex-1 bg-surface-secondary px-3 py-2 rounded-lg text-xs border border-border focus:outline-none focus:border-accent-500"
                    />
                    <button
                      type="submit"
                      disabled={!currentAnswer.trim() || isLoading}
                      className="px-3 py-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </form>
            ) : step === "complete" ? (
              <div className="p-3 bg-surface border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success-500" />
                    <span className="text-xs font-semibold text-text-primary">Prospect Profile Ready</span>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-[10px] text-text-tertiary hover:text-accent-500 transition-colors"
                  >
                    Reset ICP
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-medium text-text-tertiary uppercase">Outbound Sequence Channel</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => setOutboundChannel("email")}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                          outboundChannel === "email"
                            ? "bg-accent-500 text-white border-accent-500 shadow-sm"
                            : "bg-surface border-border text-text-secondary"
                        )}
                      >
                        Email Campaign
                      </button>
                      <button
                        onClick={() => setOutboundChannel("linkedin")}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                          outboundChannel === "linkedin"
                            ? "bg-accent-500 text-white border-accent-500 shadow-sm"
                            : "bg-surface border-border text-text-secondary"
                        )}
                      >
                        LinkedIn Connect
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleTriggerScraping}
                    className="px-5 py-3.5 bg-accent-500 hover:bg-accent-600 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    Scrape B2B Database
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-surface border border-border rounded-xl text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-accent-500 animate-spin mx-auto" />
                <p className="text-xs font-medium text-text-secondary">{scrapeProgress}</p>
              </div>
            )}
          </div>
        </div>

        {/* Query Summary Sidebar */}
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm h-fit space-y-4">
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Prospect Profile Summary</h3>

          <div className="space-y-3 text-xs">
            <SummaryItem label="Target Role" value={analyzedQuery?.role} />
            <SummaryItem label="Experience Range" value={analyzedQuery?.experience} />
            <SummaryItem label="Target Location" value={analyzedQuery?.location} />
            <SummaryItem label="Industry Sector" value={analyzedQuery?.industry} />
            <SummaryItem label="Company Size" value={analyzedQuery?.companyType} />
            <SummaryItem label="Contact Persona" value={analyzedQuery?.contactPerson} />
          </div>

          {determinedSources.length > 0 && (
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Scrape Target Sources</p>
              <div className="flex flex-wrap gap-1">
                {determinedSources.map(src => (
                  <span key={src} className="px-2 py-0.5 bg-accent-500/10 text-accent-500 font-medium rounded text-[10px] border border-accent-500/10">
                    {src}
                  </span>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="flex gap-2 p-3 bg-danger-500/10 border border-danger-500/20 text-danger-600 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-text-primary text-right max-w-[120px] truncate">
        {value || "Analyzing..."}
      </span>
    </div>
  );
}
