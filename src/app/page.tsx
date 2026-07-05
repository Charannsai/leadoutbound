"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Search,
  Bot,
  Sparkles,
  TrendingUp,
  Play,
  Check,
  Users,
  Building,
  ArrowRight,
  ExternalLink,
  Zap,
  Mail,
  MessageSquare,
  Clock,
  Compass,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardData {
  stats: {
    totalSessions: number;
    activeSessions: number;
    totalLeads: number;
    totalEmailsSent: number;
    totalReplies: number;
    replyRate: string;
    pendingReviewCount: number;
  };
  recentSessions: any[];
  recentReplies: any[];
}

export default function DashboardPage() {
  const [leadTab, setLeadTab] = useState<"people" | "companies">("people");
  const [recs, setRecs] = useState([
    { id: 1, title: "Connect your primary outreach mailbox to send emails", path: "/settings", actionLabel: "Go to Settings" },
    { id: 2, title: "Create custom folders or import your lead lists", path: "/lists", actionLabel: "Manage Lists" },
    { id: 3, title: "Describe your target ICP to the Outbound Copilot", path: "/ai-assistant", actionLabel: "Start AI Copilot" }
  ]);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });

  const stats = data?.stats;
  const recentSessions = data?.recentSessions || [];
  const recentReplies = data?.recentReplies || [];

  return (
    <div className="space-y-6">
      {/* Top Welcome Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden">
        {/* Glow element */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 z-10">
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Welcome to Apollo OutReach 👋
          </h1>
          <p className="text-xs text-text-secondary">
            Your B2B outreach workspace is active. Sync API keys, scrape target industries, and automate follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2.5 z-10">
          <Link
            href="/search"
            className="flex items-center gap-1.5 px-4 py-2 bg-surface hover:bg-surface-secondary border border-border text-text-primary text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            Prospect Database
          </Link>
          <Link
            href="/ai-assistant"
            className="flex items-center gap-1.5 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm shadow-accent-500/10"
          >
            <Bot className="w-3.5 h-3.5" />
            AI Search Wizard
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-surface-tertiary rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Database Contacts"
            value={stats?.totalLeads || 0}
            subtext="Total qualified targets"
          />
          <StatCard
            icon={Zap}
            label="Active Sequences"
            value={stats?.activeSessions || 0}
            subtext="Outreach campaigns running"
          />
          <StatCard
            icon={Mail}
            label="Emails Generated"
            value={stats?.totalEmailsSent || 0}
            subtext="Drafted & sent outreach templates"
          />
          <StatCard
            icon={TrendingUp}
            label="Campaign Reply Rate"
            value={`${stats?.replyRate || 0}%`}
            subtext="Positive interest signals"
          />
        </div>
      )}

      {/* Recommendations Checklist */}
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4.5 h-4.5 text-yellow-500" />
          <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Onboarding Checklist</h2>
        </div>

        <div className="divide-y divide-border/40 border-t border-border/40">
          {recs.map((rec) => (
            <div key={rec.id} className="flex items-center justify-between gap-4 py-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-text-tertiary">{rec.id}</span>
                </div>
                <span className="text-text-primary font-medium">{rec.title}</span>
              </div>
              <Link
                href={rec.path}
                className="px-3 py-1 bg-surface-secondary hover:bg-surface-tertiary border border-border text-text-primary font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                {rec.actionLabel}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested leads empty slate */}
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Suggested Targets</h2>
          <div className="flex items-center gap-1 bg-surface-secondary p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setLeadTab("people")}
              className={cn(
                "flex items-center gap-1 px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                leadTab === "people" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary"
              )}
            >
              <Users className="w-3 h-3" />
              People
            </button>
            <button
              onClick={() => setLeadTab("companies")}
              className={cn(
                "flex items-center gap-1 px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                leadTab === "companies" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary"
              )}
            >
              <Building className="w-3 h-3" />
              Companies
            </button>
          </div>
        </div>

        {/* Beautiful Guided Empty State */}
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border rounded-xl bg-surface-secondary/20">
          <Compass className="w-10 h-10 text-text-tertiary/20 mb-3" />
          <h3 className="text-xs font-bold text-text-primary">Suggested leads directory is empty</h3>
          <p className="text-[10px] text-text-tertiary text-center max-w-sm mt-1">
            Build campaigns using the Outbound Copilot or upload target CSV lists to seed suggested profiles automatically.
          </p>
          <Link
            href="/ai-assistant"
            className="mt-3 px-4 py-1.5 bg-accent-500 hover:bg-accent-600 text-white text-[10px] font-bold rounded-lg transition-colors shadow-sm"
          >
            Launch AI Assistant
          </Link>
        </div>
      </div>

      {/* Two Column Layout (Recent Campaigns & Recent Replies) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Sequences */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Recent Campaigns</h2>
            <Link
              href="/sequences"
              className="text-[10px] font-bold text-accent-500 hover:underline flex items-center gap-0.5"
            >
              View Campaigns <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-surface border border-border p-4 rounded-2xl min-h-[160px] flex flex-col justify-center items-center shadow-sm">
            {recentSessions.length === 0 ? (
              <div className="text-center space-y-1.5">
                <Play className="w-8 h-8 text-text-tertiary/20 mx-auto" />
                <h4 className="text-[11px] font-bold text-text-primary">No active campaigns</h4>
                <p className="text-[10px] text-text-tertiary max-w-xs">Define step sequences and enroll leads to schedule auto-emails.</p>
              </div>
            ) : (
              <div className="w-full divide-y divide-border/40">
                {recentSessions.slice(0, 3).map((session: any) => (
                  <Link
                    key={session.id}
                    href={`/sequences/${session.id}`}
                    className="flex items-center justify-between py-2.5 hover:bg-surface-secondary/20 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-xs text-text-primary truncate block">{session.name}</span>
                      <span className="text-[10px] text-text-tertiary block mt-0.5">{session._count.leads} contacts</span>
                    </div>
                    <StatusBadge status={session.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Replies */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Incoming Replies</h2>
            <Link
              href="/conversations"
              className="text-[10px] font-bold text-accent-500 hover:underline flex items-center gap-0.5"
            >
              View Inbox <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-surface border border-border p-4 rounded-2xl min-h-[160px] flex flex-col justify-center items-center shadow-sm">
            {recentReplies.length === 0 ? (
              <div className="text-center space-y-1.5">
                <MessageSquare className="w-8 h-8 text-text-tertiary/20 mx-auto" />
                <h4 className="text-[11px] font-bold text-text-primary">No incoming replies</h4>
                <p className="text-[10px] text-text-tertiary max-w-xs">Incoming email replies from qualified opportunities will sync here.</p>
              </div>
            ) : (
              <div className="w-full divide-y divide-border/40">
                {recentReplies.slice(0, 3).map((reply: any) => (
                  <div key={reply.id} className="py-2.5 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent-500/10 text-accent-500 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {(reply.fromName || reply.fromEmail)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-text-primary">{reply.fromName || reply.fromEmail}</span>
                        <span className="text-text-tertiary">{new Date(reply.receivedAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[10px] text-text-secondary truncate mt-0.5">{reply.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  subtext: string;
}) {
  return (
    <div className="p-5 rounded-2xl border border-border bg-surface shadow-sm space-y-1 relative overflow-hidden">
      <div className="flex items-center gap-1.5 text-text-tertiary">
        <Icon className="w-4 h-4 text-text-tertiary" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight text-text-primary pt-1">
        {value}
      </p>
      <p className="text-[9px] text-text-tertiary">{subtext}</p>
    </div>
  );
}
