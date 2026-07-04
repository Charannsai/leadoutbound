"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { PageHeader } from "@/components/common/page-header";
import {
  Inbox as InboxIcon,
  Send,
  FileText,
  Trash2,
  Plus,
  Paperclip,
  Download,
  Search,
  RefreshCw,
  ArrowRight,
  HelpCircle,
  AlertCircle,
  X,
  FileUp,
  User,
  Clock,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

interface Message {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  snippet: string;
  attachments: Attachment[];
}

interface Thread {
  id: string;
  snippet: string;
  messagesCount: number;
  lastMessageDate: string;
  lastSender: string;
  subject: string;
  isUnread: boolean;
}

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [activeFolder, setActiveFolder] = useState<string>("inbox");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  
  // Compose modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeFiles, setComposeFiles] = useState<File[]>([]);
  const composeFileInputRef = useRef<HTMLInputElement>(null);
  const [isSendingCompose, setIsSendingCompose] = useState(false);

  // Reply state
  const [replyBody, setReplyBody] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyError, setReplyError] = useState("");

  // Fetch email account connection info (connected email address)
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    }
  });

  const connectedEmail = settings?.gmail_connected_email || "Sandbox Account";

  // Fetch folder threads
  const { data: threads, isLoading: isLoadingThreads, refetch: refetchThreads } = useQuery<Thread[]>({
    queryKey: ["threads", activeFolder, searchQuery],
    queryFn: async () => {
      const q = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";
      const res = await fetch(`/api/inbox/threads?folder=${activeFolder}${q}`);
      if (!res.ok) throw new Error("Failed to fetch threads");
      return res.json();
    }
  });

  // Fetch thread messages
  const { data: messages, isLoading: isLoadingMessages, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["threadDetails", selectedThreadId],
    queryFn: async () => {
      if (!selectedThreadId) return [];
      const res = await fetch(`/api/inbox/threads/${selectedThreadId}`);
      if (!res.ok) throw new Error("Failed to fetch thread messages");
      return res.json();
    },
    enabled: !!selectedThreadId
  });

  // Inline reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!selectedThreadId) throw new Error("No active thread to reply to");
      const res = await fetch(`/api/inbox/threads/${selectedThreadId}/reply`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to send reply");
      }
      return res.json();
    },
    onSuccess: () => {
      setReplyBody("");
      setReplyFiles([]);
      setReplyError("");
      refetchMessages();
      refetchThreads();
    },
    onError: (err: any) => {
      setReplyError(err.message || "An error occurred while sending your reply.");
    }
  });

  // Compose new email mutation
  const sendComposeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/inbox/compose", {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to send email");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsComposeOpen(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      setComposeFiles([]);
      refetchThreads();
    }
  });

  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject || !composeBody) return;
    
    setIsSendingCompose(true);
    const fd = new FormData();
    fd.append("to", composeTo);
    fd.append("subject", composeSubject);
    fd.append("body", composeBody);
    fd.append("fromName", "Charann Sai"); // Default user signature
    composeFiles.forEach((file) => {
      fd.append("files", file);
    });

    sendComposeMutation.mutate(fd, {
      onSettled: () => setIsSendingCompose(false)
    });
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody || !messages || messages.length === 0) return;

    setIsSendingReply(true);
    const lastMsg = messages[messages.length - 1];

    const fd = new FormData();
    fd.append("to", lastMsg.from.match(/<([^>]+)>/)?.[1] || lastMsg.from);
    fd.append("subject", lastMsg.subject.startsWith("Re:") ? lastMsg.subject : `Re: ${lastMsg.subject}`);
    fd.append("body", replyBody);
    fd.append("messageId", lastMsg.id);
    fd.append("fromName", "Charann Sai");
    replyFiles.forEach((file) => {
      fd.append("files", file);
    });

    sendReplyMutation.mutate(fd, {
      onSettled: () => setIsSendingReply(false)
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const cleanEmailSender = (fromStr: string) => {
    return fromStr.split("<")[0]?.trim() || fromStr;
  };

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-border pb-5 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">Email System</h1>
          <p className="text-xs text-text-secondary mt-1">
            Connected via <span className="font-semibold text-text-primary underline">{connectedEmail}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchThreads()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface text-text-secondary hover:text-text-primary text-xs font-medium transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 hover:opacity-90 text-xs font-semibold transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            Compose
          </button>
        </div>
      </div>

      {/* Main Client Panel */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 mt-6 min-h-[580px] h-[580px]">
        
        {/* Left Column: Folders Menu */}
        <div className="md:col-span-2 flex flex-col space-y-1.5">
          <button
            onClick={() => { setActiveFolder("inbox"); setSelectedThreadId(null); }}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all",
              activeFolder === "inbox"
                ? "bg-surface-hover text-text-primary border-l-2 border-neutral-900 dark:border-neutral-50 pl-2.5"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            )}
          >
            <InboxIcon className="w-4 h-4 text-text-tertiary" />
            Inbox
          </button>
          <button
            onClick={() => { setActiveFolder("sent"); setSelectedThreadId(null); }}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all",
              activeFolder === "sent"
                ? "bg-surface-hover text-text-primary border-l-2 border-neutral-900 dark:border-neutral-50 pl-2.5"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            )}
          >
            <Send className="w-4 h-4 text-text-tertiary" />
            Sent
          </button>
          <button
            onClick={() => { setActiveFolder("drafts"); setSelectedThreadId(null); }}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all",
              activeFolder === "drafts"
                ? "bg-surface-hover text-text-primary border-l-2 border-neutral-900 dark:border-neutral-50 pl-2.5"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            )}
          >
            <FileText className="w-4 h-4 text-text-tertiary" />
            Drafts
          </button>
          <button
            onClick={() => { setActiveFolder("trash"); setSelectedThreadId(null); }}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all",
              activeFolder === "trash"
                ? "bg-surface-hover text-text-primary border-l-2 border-neutral-900 dark:border-neutral-50 pl-2.5"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            )}
          >
            <Trash2 className="w-4 h-4 text-text-tertiary" />
            Trash
          </button>
        </div>

        {/* Middle Column: Threads List */}
        <div className="md:col-span-4 border border-border rounded-2xl bg-surface flex flex-col overflow-hidden h-full shadow-sm">
          {/* Search bar inside column */}
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Search className="w-4 h-4 text-text-tertiary shrink-0 ml-1" />
            <input
              type="text"
              placeholder="Search mails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-tertiary border-none outline-none focus:outline-none focus:ring-0"
              style={{ border: "none", outline: "none", boxShadow: "none" }}
            />
          </div>

          {/* Threads list stack */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {isLoadingThreads ? (
              <div className="p-4 space-y-4 animate-pulse">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3 w-20 bg-surface-tertiary rounded" />
                      <div className="h-2 w-10 bg-surface-tertiary rounded" />
                    </div>
                    <div className="h-3 w-40 bg-surface-tertiary rounded" />
                    <div className="h-2.5 w-full bg-surface-tertiary rounded" />
                  </div>
                ))}
              </div>
            ) : threads && threads.length > 0 ? (
              threads.map((t) => {
                const isSelected = selectedThreadId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedThreadId(t.id)}
                    className={cn(
                      "w-full text-left p-4 transition-all duration-150 flex flex-col gap-1 relative",
                      isSelected
                        ? "bg-neutral-50 dark:bg-neutral-900 border-l-2 border-neutral-900 dark:border-neutral-50 pl-3.5"
                        : "hover:bg-surface-hover"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={cn(
                        "text-xs truncate max-w-[70%]",
                        t.isUnread ? "text-text-primary font-bold" : "text-text-secondary font-medium"
                      )}>
                        {cleanEmailSender(t.lastSender)}
                      </span>
                      <span className="text-[10px] text-text-tertiary shrink-0">
                        {formatTime(t.lastMessageDate)}
                      </span>
                    </div>

                    <h4 className={cn(
                      "text-xs truncate",
                      t.isUnread ? "text-text-primary font-bold" : "text-text-secondary font-medium"
                    )}>
                      {t.subject}
                    </h4>
                    
                    <p className="text-[11px] text-text-tertiary line-clamp-1">
                      {t.snippet}
                    </p>

                    {t.isUnread && (
                      <span className="absolute top-4 right-4 w-1.5 h-1.5 bg-neutral-900 dark:bg-neutral-100 rounded-full" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-48 p-4 text-center">
                <InboxIcon className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mb-2" />
                <p className="text-xs text-text-tertiary font-medium">No threads found in {activeFolder}.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation thread panel */}
        <div className="md:col-span-6 border border-border rounded-2xl bg-surface flex flex-col overflow-hidden h-full shadow-sm">
          {selectedThreadId ? (
            isLoadingMessages ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin" />
                <span className="text-xs text-text-tertiary">Loading conversation...</span>
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Thread Subject Header */}
                <div className="px-6 py-4.5 border-b border-border bg-surface-secondary shrink-0">
                  <h3 className="text-sm font-semibold text-text-primary truncate">
                    {messages[0].subject}
                  </h3>
                  <span className="text-[10px] text-text-tertiary mt-1 block">
                    {messages.length} message{messages.length > 1 ? "s" : ""} in this conversation
                  </span>
                </div>

                {/* Messages Stack */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                  {messages.map((msg, idx) => (
                    <div key={msg.id} className="border-b border-border/40 pb-6 last:border-b-0 last:pb-0">
                      {/* Sender details */}
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-border flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-text-secondary" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-text-primary block leading-none">
                              {cleanEmailSender(msg.from)}
                            </span>
                            <span className="text-[10px] text-text-tertiary mt-1 block leading-none">
                              To: {cleanEmailSender(msg.to)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatTime(msg.date)}</span>
                        </div>
                      </div>

                      {/* Message Body Content (Safe render html/plain text) */}
                      <div 
                        className="text-xs text-text-secondary font-medium leading-relaxed overflow-x-auto whitespace-pre-wrap selection:bg-neutral-800/10 dark:selection:bg-neutral-100/10"
                        dangerouslySetInnerHTML={{ __html: msg.body.includes("<html") || msg.body.includes("<body") || msg.body.includes("<div") ? msg.body : msg.body.replace(/\n/g, "<br/>") }}
                      />

                      {/* Message Attachments badges */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {msg.attachments.map((file) => (
                            <a
                              key={file.id}
                              href={`/api/inbox/attachments?messageId=${msg.id}&attachmentId=${file.id}&filename=${encodeURIComponent(file.name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-hover text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-all shadow-sm"
                            >
                              <Paperclip className="w-3.5 h-3.5 text-text-tertiary" />
                              <span className="truncate max-w-[120px]">{file.name}</span>
                              <span className="text-[10px] text-text-tertiary shrink-0">({formatFileSize(file.size)})</span>
                              <Download className="w-3.5 h-3.5 text-text-tertiary shrink-0 ml-1" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Collapsible Inline Reply Form */}
                <div className="border-t border-border p-4.5 bg-surface-secondary shrink-0">
                  {replyError && (
                    <div className="mb-3 p-3 rounded-xl bg-danger-50 text-danger-600 dark:bg-danger-900/10 dark:text-danger-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{replyError}</span>
                    </div>
                  )}

                  <form onSubmit={handleReplySubmit} className="space-y-3">
                    <textarea
                      placeholder="Type reply..."
                      rows={3}
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      className="w-full p-3 rounded-xl text-xs border border-border bg-surface text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-4 focus:ring-accent-500/5 focus:border-accent-500"
                    />

                    {/* Show files queue before reply */}
                    {replyFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {replyFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full border border-border bg-surface text-[10px] text-text-secondary"
                          >
                            <span className="truncate max-w-[110px]">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setReplyFiles((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-text-tertiary hover:text-text-primary"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => replyFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-hover text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-all shadow-sm"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-text-tertiary" />
                        Attach file
                      </button>
                      <input
                        type="file"
                        multiple
                        ref={replyFileInputRef}
                        onChange={(e) => {
                          if (e.target.files) {
                            setReplyFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                          }
                        }}
                        className="hidden"
                      />

                      <button
                        type="submit"
                        disabled={!replyBody.trim() || isSendingReply}
                        className="flex items-center gap-1.5 px-4.5 py-1.5 rounded-full bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-semibold transition-all shadow-sm"
                      >
                        {isSendingReply ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            Send Reply
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <HelpCircle className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mb-2" />
                <p className="text-xs text-text-tertiary font-medium">Failed to retrieve conversation details.</p>
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full border border-dashed border-border bg-surface-secondary">
                <InboxIcon className="w-5 h-5 text-text-tertiary" />
              </div>
              <h3 className="text-xs font-semibold text-text-primary">No conversation selected</h3>
              <p className="text-[11px] text-text-tertiary max-w-[200px] leading-relaxed mx-auto">
                Pick an email thread from the mailbox directory list to inspect message context.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Overlay Dialog Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-secondary">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">New Message</span>
                <button
                  onClick={() => setIsComposeOpen(false)}
                  className="text-text-tertiary hover:text-text-primary transition-all p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form fields */}
              <form onSubmit={handleComposeSubmit} className="p-5 flex flex-col space-y-4">
                <div className="flex items-center gap-3 border-b border-border/60 pb-2">
                  <span className="text-[11px] font-semibold text-text-tertiary shrink-0 w-8">To</span>
                  <input
                    type="email"
                    placeholder="Recipient email address..."
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    required
                    className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-tertiary border-none outline-none focus:outline-none focus:ring-0"
                    style={{ border: "none", outline: "none", boxShadow: "none" }}
                  />
                </div>

                <div className="flex items-center gap-3 border-b border-border/60 pb-2">
                  <span className="text-[11px] font-semibold text-text-tertiary shrink-0 w-8">Subject</span>
                  <input
                    type="text"
                    placeholder="Email subject..."
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    required
                    className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-tertiary border-none outline-none focus:outline-none focus:ring-0"
                    style={{ border: "none", outline: "none", boxShadow: "none" }}
                  />
                </div>

                <textarea
                  placeholder="Draft email content..."
                  rows={8}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl text-xs border border-border bg-surface text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-4 focus:ring-accent-500/5 focus:border-accent-500"
                />

                {/* Upload attachment area */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => composeFileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 w-full p-4.5 rounded-xl border border-dashed border-border bg-surface-secondary hover:bg-surface-hover text-xs font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                  >
                    <FileUp className="w-4 h-4 text-text-tertiary" />
                    Attach files to message
                  </button>
                  <input
                    type="file"
                    multiple
                    ref={composeFileInputRef}
                    onChange={(e) => {
                      if (e.target.files) {
                        setComposeFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                      }
                    }}
                    className="hidden"
                  />

                  {/* Attached files queue display */}
                  {composeFiles.length > 0 && (
                    <div className="max-h-[120px] overflow-y-auto space-y-2 mt-1">
                      {composeFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-surface text-[10px] text-text-secondary font-medium"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Paperclip className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                            <span className="truncate">{file.name}</span>
                            <span className="text-[9px] text-text-tertiary">({formatFileSize(file.size)})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setComposeFiles((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-text-tertiary hover:text-text-primary p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="px-4 py-2 rounded-full border border-border text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingCompose}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold transition-all shadow-md cursor-pointer"
                  >
                    {isSendingCompose ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Email
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
