"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Search,
  Bot,
  Sparkles,
  AlertTriangle,
  Play,
  Users,
  Building,
  ArrowRight,
  ExternalLink,
  Zap,
  Mail,
  MessageSquare,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/common/status-badge";
import { Skeleton } from "@/components/common/skeletons";

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
  recentSessions: Array<{
    id: string;
    name: string;
    searchQuery: string;
    status: string;
    updatedAt: string;
    _count: { leads: number };
  }>;
  recentReplies: Array<{
    id: string;
    subject: string | null;
    body: string;
    fromName: string | null;
    fromEmail: string;
    classification: string | null;
    receivedAt: string;
    lead: {
      companyName: string;
      contactName: string | null;
      contactEmail: string | null;
    };
  }>;
}

export default function DashboardPage() {
  const [leadTab, setLeadTab] = useState<"people" | "companies">("people");
  const [globalSearch, setGlobalSearch] = useState("");
  const [recs, setRecs] = useState([
    { id: 1, title: "Add teammates to win deals together", priority: "Important", nextStep: "Start", completed: false },
    { id: 2, title: "Connect your primary mailbox to activate sequences", priority: "Important", nextStep: "Connect", completed: false },
    { id: 3, title: "Review pending email drafts in your outbox", priority: "Medium", nextStep: "Review", completed: false },
    { id: 4, title: "Upload a CSV list to enrich company data", priority: "Low", nextStep: "Upload", completed: false }
  ]);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });

  const { data: leads } = useQuery<any[]>({
    queryKey: ["suggested-leads"],
    queryFn: async () => {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Failed to fetch leads");
      return res.json();
    }
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const stats = data?.stats;
  const recentSessions = data?.recentSessions || [];
  const recentReplies = data?.recentReplies || [];

  const suggestedPeople = (leads || []).slice(0, 4);
  const suggestedCompanies = Array.from(
    new Map((leads || []).map((item: any) => [item.companyName, item])).values()
  ).slice(0, 4);

  const handleCompleteRec = (id: number) => {
    setRecs(prev => prev.map(r => r.id === id ? { ...r, completed: true } : r));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Alert (Credits notification) */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-text-primary">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-accent-500" />
          <span>
            Your <strong>85 monthly credits</strong> expire in 1 day. Annual plans include 30,000+ credits upfront to use all year.
          </span>
        </div>
        <Link
          href="/settings"
          className="px-3 py-1 bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          Upgrade Plan
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Database Leads"
          value={stats?.totalLeads || 0}
        />
        <StatCard
          icon={Mail}
          label="Sequences Active"
          value={stats?.activeSessions || 0}
        />
        <StatCard
          icon={Play}
          label="Total Emails Sent"
          value={stats?.totalEmailsSent || 0}
        />
        <StatCard
          icon={TrendingUp}
          label="Reply Rate %"
          value={`${stats?.replyRate || 0}%`}
        />
      </div>

      {/* Recommendations card (Apollo Style) */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-text-primary">Recommendations</h2>
          </div>
          <span className="text-[10px] text-accent-500 font-bold px-2 py-0.5 bg-accent-500/10 rounded-full">
            Active
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-text-tertiary">
                <th className="pb-2 font-medium">Title</th>
                <th className="pb-2 font-medium">Priority</th>
                <th className="pb-2 font-medium">Next Steps</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recs.filter(r => !r.completed).map(rec => (
                <tr key={rec.id} className="border-b border-border/40 hover:bg-surface-secondary/40 transition-colors">
                  <td className="py-3 text-text-primary font-medium">{rec.title}</td>
                  <td className="py-3">
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded-full",
                      rec.priority === "Important" ? "bg-orange-500/10 text-orange-500" :
                      rec.priority === "Medium" ? "bg-blue-500/10 text-blue-500" : "bg-neutral-500/10 text-neutral-500"
                    )}>
                      {rec.priority}
                    </span>
                  </td>
                  <td className="py-3">
                    <button className="px-2.5 py-1 bg-surface-secondary hover:bg-surface-tertiary border border-border font-medium rounded text-text-primary transition-colors">
                      {rec.nextStep}
                    </button>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleCompleteRec(rec.id)}
                        className="p-1 text-text-tertiary hover:text-success-600 hover:bg-success-500/10 rounded transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suggested leads (Apollo Style) */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Suggested leads</h2>
          <div className="flex items-center gap-1 bg-surface-secondary p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setLeadTab("people")}
              className={cn(
                "flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all",
                leadTab === "people" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              People
            </button>
            <button
              onClick={() => setLeadTab("companies")}
              className={cn(
                "flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all",
                leadTab === "companies" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary"
              )}
            >
              <Building className="w-3.5 h-3.5" />
              Companies
            </button>
          </div>
        </div>

        {/* Lead Suggested items container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {leadTab === "people" ? (
            suggestedPeople.map((person: any) => (
              <div key={person.id} className="border border-border/80 rounded-xl p-4 bg-surface hover:border-accent-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-text-primary truncate">{person.contactName}</p>
                    <span className="px-1.5 py-0.5 bg-success-500/10 text-success-600 text-[8px] font-bold rounded">Verified</span>
                  </div>
                  <p className="text-[10px] text-text-secondary truncate">{person.contactTitle}</p>
                  <p className="text-[10px] text-accent-500 truncate font-semibold">{person.companyName}</p>
                  <p className="text-[9px] text-text-tertiary truncate">{person.location}</p>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <button className="flex-1 py-1.5 bg-accent-500/10 hover:bg-accent-500 text-accent-500 hover:text-white text-[10px] font-bold rounded-lg transition-colors border border-accent-500/20">
                    Reveal Email
                  </button>
                </div>
              </div>
            ))
          ) : (
            suggestedCompanies.map((company: any) => (
              <div key={company.id} className="border border-border/80 rounded-xl p-4 bg-surface hover:border-accent-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-text-primary truncate">{company.companyName}</p>
                    <ExternalLink className="w-3 h-3 text-text-tertiary" />
                  </div>
                  <p className="text-[10px] text-text-secondary truncate">{company.industry}</p>
                  <p className="text-[9px] text-text-tertiary">Size: {company.companySize} employees</p>
                  <p className="text-[9px] text-text-tertiary truncate">{company.location}</p>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <button className="flex-1 py-1.5 bg-accent-500/10 hover:bg-accent-500 text-accent-500 hover:text-white text-[10px] font-bold rounded-lg transition-colors border border-accent-500/20">
                    Save Company
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Two Column Layout (Recent Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sequences */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Recent Sequences
            </h2>
            <Link
              href="/sequences"
              className="text-xs text-text-tertiary hover:text-accent-500 transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-1.5 bg-surface border border-border p-3 rounded-xl">
            {recentSessions.length === 0 ? (
              <div className="text-center py-6 text-xs text-text-tertiary">No sequences yet.</div>
            ) : (
              recentSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/sequences/${session.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-surface-secondary transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-text-primary truncate group-hover:text-accent-500 transition-colors">
                      {session.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-tertiary">
                      <span>{session._count.leads} leads</span>
                      <span>·</span>
                      <span>Updated {new Date(session.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <StatusBadge status={session.status} />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Replies */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Recent Replies
            </h2>
            <Link
              href="/inbox"
              className="text-xs text-text-tertiary hover:text-accent-500 transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-1.5 bg-surface border border-border p-3 rounded-xl">
            {recentReplies.length === 0 ? (
              <div className="text-center py-6 text-xs text-text-tertiary">No replies yet.</div>
            ) : (
              recentReplies.map((reply) => (
                <div
                  key={reply.id}
                  className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-surface-secondary transition-colors"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-tertiary text-text-secondary text-xs font-bold shrink-0 mt-0.5">
                    {(reply.fromName || reply.fromEmail)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-text-primary truncate">
                        {reply.fromName || reply.fromEmail}
                      </p>
                      {reply.classification && (
                        <StatusBadge status={reply.classification} />
                      )}
                    </div>
                    <p className="text-[10px] text-text-secondary truncate">
                      {reply.lead.companyName}
                    </p>
                    <p className="text-[10px] text-text-tertiary line-clamp-1">
                      {reply.body}
                    </p>
                  </div>
                </div>
              ))
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <div className="px-4 py-3.5 rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-4 h-4 text-text-tertiary" />
        <span className="text-xs text-text-secondary font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight text-text-primary">
        {value}
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
        ))}
      </div>

      {/* Action shortcuts */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 border border-border bg-surface rounded-xl space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        ))}
      </div>

      {/* Table Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <div className="p-5 border border-border bg-surface rounded-xl space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-border/40">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Replies */}
        <div className="p-5 border border-border bg-surface rounded-xl space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-2 border-b border-border/40 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
