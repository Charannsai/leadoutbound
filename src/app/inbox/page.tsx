"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
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
  ArrowLeft,
  HelpCircle,
  AlertCircle,
  X,
  FileUp,
  User,
  Clock,
  Sparkles
} from "lucide-react";
import Link from "next/link";
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
    <div className="w-screen h-screen flex flex-row bg-body-bg overflow-hidden select-none">
      
      {/* Column 1: Mailboxes Sidebar List */}
      <div className="w-56 bg-surface-secondary/40 border-r border-border flex flex-col justify-between p-4.5 shrink-0 h-full">
        <div className="space-y-5">
          {/* Back Action */}
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-text-tertiary hover:text-text-primary hover:bg-neutral-900/5 dark:hover:bg-white/5 transition-all w-full"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Exit Workspace
          </Link>

          {/* Compose trigger */}
          <button
            onClick={() => setIsComposeOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 hover:opacity-90 text-xs font-semibold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Compose
          </button>

          {/* Folders List */}
          <div className="space-y-1 relative">
            <button
              onClick={() => { setActiveFolder("inbox"); setSelectedThreadId(null); }}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all relative z-10",
                activeFolder === "inbox" ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {activeFolder === "inbox" && (
                <motion.span
                  layoutId="activeFolderBg"
                  className="absolute inset-0 bg-neutral-100 dark:bg-neutral-900 rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <InboxIcon className="w-4 h-4 text-text-tertiary" />
              Inbox
            </button>
            <button
              onClick={() => { setActiveFolder("sent"); setSelectedThreadId(null); }}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all relative z-10",
                activeFolder === "sent" ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {activeFolder === "sent" && (
                <motion.span
                  layoutId="activeFolderBg"
                  className="absolute inset-0 bg-neutral-100 dark:bg-neutral-900 rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Send className="w-4 h-4 text-text-tertiary" />
              Sent
            </button>
            <button
              onClick={() => { setActiveFolder("drafts"); setSelectedThreadId(null); }}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all relative z-10",
                activeFolder === "drafts" ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {activeFolder === "drafts" && (
                <motion.span
                  layoutId="activeFolderBg"
                  className="absolute inset-0 bg-neutral-100 dark:bg-neutral-900 rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <FileText className="w-4 h-4 text-text-tertiary" />
              Drafts
            </button>
            <button
              onClick={() => { setActiveFolder("trash"); setSelectedThreadId(null); }}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all relative z-10",
                activeFolder === "trash" ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {activeFolder === "trash" && (
                <motion.span
                  layoutId="activeFolderBg"
                  className="absolute inset-0 bg-neutral-100 dark:bg-neutral-900 rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Trash2 className="w-4 h-4 text-text-tertiary" />
              Trash
            </button>
          </div>
        </div>

        {/* User connected info badge */}
        <div className="p-3 bg-surface border border-border rounded-xl flex items-center gap-2.5 shadow-sm select-none">
          <div className="w-7 h-7 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center font-bold text-xs shrink-0">
            {connectedEmail.substring(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold text-text-primary block truncate leading-none">Charann Sai</span>
            <span className="text-[9px] text-text-tertiary block truncate mt-1 leading-none">{connectedEmail}</span>
          </div>
        </div>
      </div>

      {/* Column 2: Thread conversations lists */}
      <div className="w-80 border-r border-border flex flex-col bg-surface shrink-0 h-full">
        {/* Search header with Refresh integrated */}
        <div className="p-3.5 border-b border-border flex items-center gap-2 bg-surface shrink-0">
          <Search className="w-4 h-4 text-text-tertiary shrink-0 ml-1" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-tertiary border-none outline-none focus:outline-none focus:ring-0"
            style={{ border: "none", outline: "none", boxShadow: "none" }}
          />
          <button
            onClick={() => refetchThreads()}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-tertiary hover:text-text-primary transition-colors shrink-0"
            title="Refresh inbox"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Thread list scroll block */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/30 bg-surface">
          {isLoadingThreads ? (
            <div className="p-4 space-y-4 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-16 bg-surface-tertiary rounded" />
                    <div className="h-2 w-8 bg-surface-tertiary rounded" />
                  </div>
                  <div className="h-3 w-36 bg-surface-tertiary rounded" />
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
                    "w-full text-left p-4 transition-all duration-200 flex flex-col gap-1.5 relative border-l-2",
                    isSelected
                      ? "bg-neutral-50/70 dark:bg-neutral-900/40 border-neutral-900 dark:border-neutral-50 pl-3.5"
                      : "hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20 border-transparent"
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
                    <span className="absolute top-4.5 right-4.5 w-1.5 h-1.5 bg-neutral-900 dark:bg-neutral-50 rounded-full" />
                  )}
                </button>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-48 p-4 text-center">
              <InboxIcon className="w-7 h-7 text-neutral-300 dark:text-neutral-700 mb-2" />
              <p className="text-xs text-text-tertiary font-medium">No threads in {activeFolder}.</p>
            </div>
          )}
        </div>
      </div>

      {/* Column 3: Message conversation body panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface h-full">
        {selectedThreadId ? (
          isLoadingMessages ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-5 h-5 text-neutral-400 animate-spin" />
              <span className="text-xs text-text-tertiary">Loading conversation...</span>
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="flex-1 flex flex-col overflow-hidden h-full">
              
              {/* Header */}
              <div className="px-6 py-4.5 border-b border-border bg-surface-secondary/20 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-semibold text-text-primary truncate max-w-[85%]">
                  {messages[0].subject}
                </h3>
                <span className="text-[10px] text-text-tertiary font-medium">
                  {messages.length} message{messages.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Messages Body stack */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className="border-b border-border/40 pb-5 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-border flex items-center justify-center shrink-0 select-none">
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
                      <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTime(msg.date)}</span>
                      </div>
                    </div>

                    <div 
                      className="email-body-container text-xs text-text-secondary font-medium leading-relaxed whitespace-pre-wrap selection:bg-neutral-800/10 dark:selection:bg-neutral-100/10 select-text"
                      dangerouslySetInnerHTML={{ 
                        __html: msg.body.includes("<html") || msg.body.includes("<body") || msg.body.includes("<div") 
                          ? msg.body 
                          : msg.body.replace(/\n/g, "<br/>") 
                      }}
                    />

                    {/* Attachments badges */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {msg.attachments.map((file) => (
                          <a
                            key={file.id}
                            href={`/api/inbox/attachments?messageId=${msg.id}&attachmentId=${file.id}&filename=${encodeURIComponent(file.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-hover text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-all shadow-sm"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-text-tertiary" />
                            <span className="truncate max-w-[120px]">{file.name}</span>
                            <span className="text-[9px] text-text-tertiary shrink-0">({formatFileSize(file.size)})</span>
                            <Download className="w-3.5 h-3.5 text-text-tertiary shrink-0 ml-1" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Inline Thread Reply */}
              <div className="border-t border-border p-4.5 bg-surface-secondary/20 shrink-0">
                {replyError && (
                  <div className="mb-3 p-3 rounded-xl bg-danger-50 text-danger-600 dark:bg-danger-900/10 dark:text-danger-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{replyError}</span>
                  </div>
                )}

                <form onSubmit={handleReplySubmit} className="space-y-3">
                  <textarea
                    placeholder="Draft a response..."
                    rows={3}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    className="w-full p-3 rounded-xl text-xs border border-border bg-surface text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-4 focus:ring-accent-500/5 focus:border-accent-500"
                  />

                  {/* Attachment queue */}
                  {replyFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {replyFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full border border-border bg-surface text-[9px] text-text-secondary font-medium"
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
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-hover text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-all shadow-sm"
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
                      className="flex items-center gap-1.5 px-4.5 py-1.5 rounded-full bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-semibold transition-all shadow-sm"
                    >
                      {isSendingReply ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Reply
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
              <HelpCircle className="w-7 h-7 text-neutral-300 dark:text-neutral-700 mb-2" />
              <p className="text-xs text-text-tertiary font-medium">Failed to retrieve conversation details.</p>
            </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl border border-border bg-surface-secondary shadow-sm">
              <InboxIcon className="w-4.5 h-4.5 text-text-tertiary" />
            </div>
            <h3 className="text-xs font-semibold text-text-primary">No conversation selected</h3>
            <p className="text-[11px] text-text-tertiary max-w-[200px] leading-relaxed mx-auto">
              Pick an email thread from the mailbox list directory to inspect message context.
            </p>
          </div>
        )}
      </div>

      {/* Floating Compose Widget (Gmail / Superhuman style bottom-right dock) */}
      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed bottom-6 right-6 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="w-[500px] h-[480px] bg-surface border border-border rounded-2xl shadow-[0_15px_45px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden"
            >
              {/* Dark minimalist header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-neutral-900 text-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 select-none shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider">New Message</span>
                <button
                  onClick={() => setIsComposeOpen(false)}
                  className="text-neutral-400 hover:text-white transition-colors p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form container */}
              <form onSubmit={handleComposeSubmit} className="flex-1 flex flex-col min-h-0 bg-surface">
                {/* Borderless Fields */}
                <div className="px-4 py-2 flex items-center gap-2 border-b border-border/40 text-xs shrink-0">
                  <span className="text-text-tertiary w-12 font-semibold">To</span>
                  <input
                    type="email"
                    placeholder="Recipient address..."
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    required
                    className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-tertiary border-none outline-none focus:outline-none focus:ring-0"
                    style={{ border: "none", outline: "none", boxShadow: "none" }}
                  />
                </div>

                <div className="px-4 py-2 flex items-center gap-2 border-b border-border/40 text-xs shrink-0">
                  <span className="text-text-tertiary w-12 font-semibold">Subject</span>
                  <input
                    type="text"
                    placeholder="Email title..."
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    required
                    className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-tertiary border-none outline-none focus:outline-none focus:ring-0"
                    style={{ border: "none", outline: "none", boxShadow: "none" }}
                  />
                </div>

                {/* Canvas */}
                <textarea
                  placeholder="Draft your message..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  required
                  className="flex-1 w-full p-4 text-xs bg-transparent border-none outline-none resize-none text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-0"
                  style={{ border: "none", outline: "none", boxShadow: "none" }}
                />

                {/* Attachments pills bar */}
                {composeFiles.length > 0 && (
                  <div className="px-4 py-2 flex flex-wrap gap-2 max-h-[80px] overflow-y-auto border-t border-border/30 bg-surface-secondary/20 shrink-0">
                    {composeFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full border border-border bg-surface text-[9px] text-text-secondary font-semibold"
                      >
                        <Paperclip className="w-3 h-3 text-text-tertiary shrink-0" />
                        <span className="truncate max-w-[120px]">{file.name}</span>
                        <span className="text-text-tertiary font-medium">({formatFileSize(file.size)})</span>
                        <button
                          type="button"
                          onClick={() => setComposeFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-text-tertiary hover:text-text-primary p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions widget bar */}
                <div className="px-4 py-3 border-t border-border bg-surface-secondary/40 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => composeFileInputRef.current?.click()}
                      className="p-2 rounded-full border border-border bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-all shadow-sm cursor-pointer"
                      title="Attach documents"
                    >
                      <Paperclip className="w-4 h-4 text-text-tertiary" />
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
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsComposeOpen(false)}
                      className="px-4 py-1.5 rounded-full border border-border text-[11px] font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all cursor-pointer"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingCompose}
                      className="flex items-center gap-1.5 px-4.5 py-1.5 rounded-full bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-semibold transition-all shadow-sm cursor-pointer"
                    >
                      {isSendingCompose ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
