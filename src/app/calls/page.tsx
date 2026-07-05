"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  Clock,
  MessageSquare,
  TrendingUp,
  User,
  ExternalLink,
  PhoneCall,
  Calendar,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/common/status-badge";

export default function CallsPage() {
  // Fetch Call Logs
  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["call-logs"],
    queryFn: async () => {
      const res = await fetch("/api/calls");
      if (!res.ok) throw new Error("Failed to fetch call logs");
      return res.json();
    }
  });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Metrics
  const totalCalls = logs.length;
  const connectedCalls = logs.filter(l => l.outcome === "connected" || l.outcome === "meeting_scheduled").length;
  const connectionRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;
  
  const totalDuration = logs.reduce((sum, l) => sum + (l.duration || 0), 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-3 shrink-0">
        <h1 className="text-lg font-bold text-text-primary">Outbound Call Log</h1>
        <p className="text-xs text-text-secondary">Track phone dial outreach history, outcomes, and disposition notes logged from Sequences.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <Phone className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase">Total Dialed</span>
          </div>
          <p className="text-xl font-bold text-text-primary">{totalCalls} calls</p>
        </div>

        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <TrendingUp className="w-4 h-4 text-success-500" />
            <span className="text-[10px] font-bold uppercase">Connection Rate</span>
          </div>
          <p className="text-xl font-bold text-text-primary">{connectionRate}%</p>
        </div>

        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <Clock className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase">Avg. Call Duration</span>
          </div>
          <p className="text-xl font-bold text-text-primary">{formatDuration(avgDuration)} mins</p>
        </div>

        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <Calendar className="w-4 h-4 text-accent-500" />
            <span className="text-[10px] font-bold uppercase">Meetings Booked</span>
          </div>
          <p className="text-xl font-bold text-text-primary">
            {logs.filter(l => l.outcome === "meeting_scheduled").length} scheduled
          </p>
        </div>
      </div>

      {/* Grid List */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface-secondary flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-text-secondary">Recent Dial Activity</span>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-surface-tertiary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16">
              <PhoneCall className="w-12 h-12 text-text-tertiary/20 mx-auto mb-3" />
              <p className="text-sm font-semibold text-text-secondary">No calls logged yet</p>
              <p className="text-xs text-text-tertiary mt-1">Initiate calls from sequence target contacts inside Sequence Details.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-text-tertiary bg-surface-secondary/40 sticky top-0 backdrop-blur z-10 font-semibold">
                  <th className="py-2.5 px-4">Contact</th>
                  <th className="py-2.5 px-2">Company</th>
                  <th className="py-2.5 px-2">Dial Outcome</th>
                  <th className="py-2.5 px-2">Duration</th>
                  <th className="py-2.5 px-2">Call Notes Summary</th>
                  <th className="py-2.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/40 hover:bg-surface-secondary/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-text-primary">{log.lead.contactName}</td>
                    <td className="py-3 px-2 text-text-secondary font-medium">{log.lead.companyName}</td>
                    <td className="py-3 px-2">
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase border border-border/50",
                        log.outcome === "connected" ? "bg-success-500/10 text-success-600 border-success-500/20" :
                        log.outcome === "meeting_scheduled" ? "bg-accent-500/10 text-accent-500 border-accent-500/20" :
                        log.outcome === "left_voicemail" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-neutral-500/10 text-neutral-500"
                      )}>
                        {log.outcome.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-mono text-text-secondary">{formatDuration(log.duration)}</td>
                    <td className="py-3 px-2 text-text-secondary max-w-xs truncate font-medium" title={log.notes}>
                      {log.notes || <span className="text-text-tertiary italic">No notes logged</span>}
                    </td>
                    <td className="py-3 px-4 text-right text-text-tertiary">
                      {new Date(log.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
