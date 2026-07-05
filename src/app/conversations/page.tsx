"use client";

import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare,
  User,
  Clock,
  TrendingUp,
  Inbox,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/common/status-badge";

export default function ConversationsPage() {
  // Fetch dashboard data which contains replies classification list
  const { data, isLoading } = useQuery<any>({
    queryKey: ["conversations-data"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    }
  });

  const replies = data?.recentReplies || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-3 shrink-0">
        <h1 className="text-lg font-bold text-text-primary">Conversations & Replies</h1>
        <p className="text-xs text-text-secondary">Analyze incoming lead email replies, automatically classified by AI sentiment indicators.</p>
      </div>

      {/* Metrics overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <Inbox className="w-4 h-4 text-accent-500" />
            <span className="text-[10px] font-bold uppercase">Total Replies</span>
          </div>
          <p className="text-xl font-bold text-text-primary">{replies.length} replies</p>
        </div>

        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <Sparkles className="w-4 h-4 text-success-500" />
            <span className="text-[10px] font-bold uppercase">Positive Interest</span>
          </div>
          <p className="text-xl font-bold text-text-primary">
            {replies.filter((r: any) => r.classification === "positive_interest" || r.classification === "interview").length} leads
          </p>
        </div>

        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] font-bold uppercase">Avg Response Time</span>
          </div>
          <p className="text-xl font-bold text-text-primary">2.4 hours</p>
        </div>
      </div>

      {/* List */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface-secondary flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-text-secondary">Conversation History</span>
        </div>

        <div className="divide-y divide-border/60">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-14 bg-surface-tertiary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : replies.length === 0 ? (
            <div className="text-center py-20">
              <MessageSquare className="w-12 h-12 text-text-tertiary/20 mx-auto mb-3" />
              <p className="text-sm font-semibold text-text-secondary">No replies recorded yet</p>
              <p className="text-xs text-text-tertiary mt-1">Replies will appear automatically once sent emails receive lead responses.</p>
            </div>
          ) : (
            replies.map((reply: any) => (
              <div key={reply.id} className="p-4 hover:bg-surface-secondary/20 transition-all flex items-start gap-4 text-xs">
                {/* Initials circle */}
                <div className="w-8 h-8 rounded-full bg-accent-500/10 text-accent-500 flex items-center justify-center shrink-0 font-bold text-xs">
                  {(reply.fromName || reply.fromEmail)[0].toUpperCase()}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-text-primary">{reply.fromName || reply.fromEmail}</span>
                      <span className="text-text-tertiary"> · {reply.lead.companyName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={reply.classification || "unread"} />
                      <span className="text-[10px] text-text-tertiary">
                        {new Date(reply.receivedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="font-bold text-text-primary">Subject: {reply.subject || "No Subject"}</div>
                  <p className="text-text-secondary line-clamp-2 bg-surface-secondary/40 border border-border/40 p-2.5 rounded-lg whitespace-pre-line font-mono leading-relaxed mt-1">
                    {reply.body}
                  </p>
                </div>

                <div className="shrink-0 pt-1">
                  <Link
                    href="/emails"
                    className="p-1 hover:bg-surface-secondary border border-border hover:border-text-tertiary rounded transition-colors inline-block"
                  >
                    <ChevronRight className="w-4 h-4 text-text-tertiary" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
