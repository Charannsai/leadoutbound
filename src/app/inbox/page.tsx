"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import {
  Inbox as InboxIcon,
  RefreshCw,
  MailOpen,
  Mail,
  ChevronRight,
  ExternalLink,
  Clock,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface ReplyMessage {
  id: string;
  leadId: string;
  gmailThreadId: string | null;
  gmailMessageId: string | null;
  subject: string | null;
  body: string;
  fromEmail: string;
  fromName: string | null;
  classification: string | null;
  isRead: boolean;
  receivedAt: string;
  lead: {
    companyName: string;
    contactName: string | null;
    contactEmail: string | null;
    sessionId: string;
    session: { name: string };
  };
}

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");

  const { data: replies, isLoading } = useQuery<ReplyMessage[]>({
    queryKey: ["inbox"],
    queryFn: async () => {
      const res = await fetch("/api/inbox");
      if (!res.ok) throw new Error("Failed to fetch inbox");
      return res.json();
    }
  });

  const markAsRead = useMutation({
    mutationFn: async ({ id, isRead }: { id: string; isRead: boolean }) => {
      const res = await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead })
      });
      if (!res.ok) throw new Error("Failed to update reply status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus("Connecting to server...");
    try {
      const res = await fetch("/api/inbox/sync", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      setSyncStatus(data.count > 0 ? `Synced ${data.count} new replies!` : "No new replies.");
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      setTimeout(() => setSyncStatus(""), 3000);
    } catch (err) {
      console.error(err);
      setSyncStatus("Sync failed.");
      setTimeout(() => setSyncStatus(""), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const selectMessage = (msg: ReplyMessage) => {
    setSelectedReplyId(msg.id);
    if (!msg.isRead) {
      markAsRead.mutate({ id: msg.id, isRead: true });
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-32 bg-surface-tertiary rounded mb-2" />
        <div className="h-4 w-64 bg-surface-tertiary rounded mb-8" />
        <div className="grid grid-cols-3 gap-6 h-[400px]">
          <div className="col-span-1 bg-surface-tertiary rounded-xl" />
          <div className="col-span-2 bg-surface-tertiary rounded-xl" />
        </div>
      </div>
    );
  }

  const list = replies || [];
  const selectedMsg = list.find(r => r.id === selectedReplyId);

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Unified outreach replies synced with your Gmail account"
        action={
          <div className="flex items-center gap-2">
            {syncStatus && (
              <span className="text-xs text-text-secondary animate-pulse-subtle bg-surface-secondary px-2.5 py-1 rounded-md border border-border">
                {syncStatus}
              </span>
            )}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 transition-colors"
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Sync Inbox
            </button>
          </div>
        }
      />

      {list.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[560px] mt-6">
          {/* Messages list */}
          <div className="md:col-span-1 border border-border rounded-xl bg-surface overflow-y-auto divide-y divide-border">
            {list.map((msg) => {
              const isSelected = selectedReplyId === msg.id;
              return (
                <button
                  key={msg.id}
                  onClick={() => selectMessage(msg)}
                  className={cn(
                    "w-full text-left p-4 transition-all duration-150 flex items-start justify-between gap-3 relative",
                    isSelected ? "bg-accent-500/5 dark:bg-accent-900/10 border-l-4 border-accent-500" : "hover:bg-surface-hover"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={cn(
                        "text-xs truncate",
                        msg.isRead ? "text-text-secondary font-medium" : "text-text-primary font-bold"
                      )}>
                        {msg.fromName || msg.fromEmail}
                      </span>
                      {!msg.isRead && (
                        <span className="w-1.5 h-1.5 bg-accent-500 rounded-full shrink-0" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] font-semibold text-text-primary bg-surface-tertiary px-1.5 py-0.5 rounded">
                        {msg.lead.companyName}
                      </span>
                      {msg.classification && (
                        <StatusBadge status={msg.classification} className="scale-90" />
                      )}
                    </div>

                    <p className="text-[11px] text-text-tertiary truncate font-medium">{msg.subject}</p>
                    <p className="text-[11px] text-text-tertiary line-clamp-1 mt-0.5">{msg.body}</p>
                  </div>
                  
                  <div className="text-[10px] text-text-tertiary shrink-0 self-center">
                    {formatTime(msg.receivedAt)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detailed Message panel */}
          <div className="md:col-span-2 border border-border rounded-xl bg-surface p-6 flex flex-col h-full overflow-hidden">
            {selectedMsg ? (
              <div className="flex flex-col h-full gap-4 min-w-0">
                <div className="flex items-start justify-between border-b border-border pb-4 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-text-primary text-sm">{selectedMsg.fromName || selectedMsg.fromEmail}</h4>
                      <span className="text-text-tertiary text-xs">&lt;{selectedMsg.fromEmail}&gt;</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-text-secondary">
                      <span className="font-semibold text-text-primary">{selectedMsg.lead.companyName}</span>
                      <span className="text-text-tertiary">·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(selectedMsg.receivedAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/sessions/${selectedMsg.lead.sessionId}`}
                      className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-text-primary hover:bg-surface-hover transition-colors"
                    >
                      Session
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="text-xs font-semibold text-text-secondary py-1 border-b border-dashed border-border shrink-0">
                  Subject: {selectedMsg.subject || "No Subject"}
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0 text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                  {selectedMsg.body}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-text-tertiary">
                <MailOpen className="w-8 h-8 mb-3" />
                <p className="text-xs">Select a reply email from the panel to view conversation thread details.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={InboxIcon}
          title="Inbox Empty"
          description="Sync inbox to parse active thread responses. Direct connection settings will fetch received emails."
          action={
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-accent-500 text-white hover:bg-accent-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Sync Now
            </button>
          }
        />
      )}
    </div>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 24 * 3600000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
