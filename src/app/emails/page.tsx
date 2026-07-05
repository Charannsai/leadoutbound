"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
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

// Sandbox IFrame Email Body renderer (matches Gmail styling standards)
function EmailIframe({ htmlContent }: { htmlContent: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState("300px");

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 13.5px;
              line-height: 1.6;
              color: #222222;
              margin: 0;
              padding: 4px;
              background-color: #ffffff;
              word-wrap: break-word;
              word-break: break-word;
            }
            img {
              max-width: 100% !important;
              height: auto !important;
            }
            table {
              max-width: 100% !important;
              width: 100% !important;
              border-collapse: collapse;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            function sendHeight() {
              const h = document.documentElement.scrollHeight || document.body.scrollHeight;
              window.parent.postMessage({ type: 'resize-iframe', height: h }, '*');
            }
            window.addEventListener('load', sendHeight);
            window.addEventListener('resize', sendHeight);
            if (window.ResizeObserver) {
              const ro = new ResizeObserver(sendHeight);
              ro.observe(document.body);
            }
          </script>
        </body>
      </html>
    `);
    doc.close();

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'resize-iframe') {
        setHeight(event.data.height + "px");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [htmlContent]);

  return (
    <iframe
      ref={iframeRef}
      style={{
        width: "100%",
        height: height,
        border: "none",
        overflow: "hidden",
        background: "#ffffff"
      }}
      title="Email Content"
      sandbox="allow-same-origin allow-popups"
    />
  );
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
      
      {/* Column 1: Mailboxes Sidebar List (Frosted Glassmorphism look) */}
      <div className="w-56 bg-gradient-to-b from-surface-secondary/40 to-surface-secondary/10 backdrop-blur-md border-r border-border flex flex-col justify-between p-4.5 shrink-0 h-full">
        <div className="space-y-6">
          {/* Back Action */}
          <Link
            href="/"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-text-tertiary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-900/50 transition-all w-full shadow-sm border border-border/30 bg-surface/30"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Exit Workspace
          </Link>

          {/* Compose trigger */}
          <button
            onClick={() => setIsComposeOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-semibold transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)] active:scale-[0.98] cursor-pointer"
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
                  className="absolute inset-0 bg-surface border border-border rounded-xl -z-10 shadow-sm"
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
                  className="absolute inset-0 bg-surface border border-border rounded-xl -z-10 shadow-sm"
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
                  className="absolute inset-0 bg-surface border border-border rounded-xl -z-10 shadow-sm"
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
                  className="absolute inset-0 bg-surface border border-border rounded-xl -z-10 shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Trash2 className="w-4 h-4 text-text-tertiary" />
              Trash
            </button>
          </div>
        </div>

        {/* User connected info badge (Radial Gradient layout) */}
        <div className="p-3 bg-surface border border-border rounded-2xl flex items-center gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] select-none">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-950 dark:from-neutral-100 dark:to-neutral-300 text-white dark:text-neutral-950 flex items-center justify-center font-bold text-xs shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.1)]">
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
          <div className="flex items-center gap-2 flex-1 bg-surface-secondary/60 rounded-xl px-3 py-1.5 border border-border/40 focus-within:border-neutral-400 dark:focus-within:border-neutral-600 transition-all duration-200">
            <Search className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-tertiary border-none outline-none focus:outline-none focus:ring-0"
              style={{ border: "none", outline: "none", boxShadow: "none" }}
            />
            <span className="hidden sm:inline-block text-[9px] font-bold text-text-tertiary bg-surface border border-border/80 px-1 py-0.5 rounded select-none">
              ⌘K
            </span>
          </div>
          <button
            onClick={() => refetchThreads()}
            className="p-2 rounded-xl hover:bg-surface-hover text-text-tertiary hover:text-text-primary border border-transparent hover:border-border transition-all shrink-0 cursor-pointer"
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
                    "w-full text-left p-4 transition-all duration-200 flex flex-col gap-1.5 relative border-l-2 select-none active:scale-[0.99]",
                    isSelected
                      ? "bg-gradient-to-r from-neutral-100/60 to-neutral-50/10 dark:from-neutral-900/40 dark:to-neutral-900/5 border-neutral-900 dark:border-neutral-50 pl-3.5 shadow-[inset_0_1px_0_rgba(0,0,0,0.01)]"
                      : "hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    {/* Sender Avatar + Name block */}
                    <div className="flex items-center gap-2 truncate max-w-[75%]">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center text-[9px] font-bold text-text-primary select-none shrink-0 shadow-sm">
                        {t.lastSender.substring(0, 1).toUpperCase()}
                      </div>
                      <span className={cn(
                        "text-xs truncate",
                        t.isUnread ? "text-text-primary font-bold" : "text-text-secondary font-medium"
                      )}>
                        {cleanEmailSender(t.lastSender)}
                      </span>
                    </div>
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
                    <span className="absolute top-4.5 right-4.5 w-1.5 h-1.5 bg-neutral-900 dark:bg-neutral-50 rounded-full shadow-sm animate-pulse" />
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

      {/* Column 3: Message conversation body panel (Redesigned like Gmail) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface h-full">
        {selectedThreadId ? (
          isLoadingMessages ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-surface-secondary/5">
              <RefreshCw className="w-5 h-5 text-neutral-400 animate-spin" />
              <span className="text-xs text-text-tertiary">Loading conversation...</span>
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="flex-1 flex flex-col overflow-hidden h-full bg-surface">
              
              {/* Thread Subject Title (Large title on top) */}
              <div className="px-8 py-5 border-b border-border/80 flex items-center justify-between shrink-0">
                <h3 className="text-base font-semibold text-text-primary truncate max-w-[80%]">
                  {messages[0].subject}
                </h3>
                <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary bg-surface-secondary border border-border/65 px-2.5 py-0.5 rounded-full select-none">
                  {messages.length} message{messages.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Messages Body Stack (No floating cards, clean divider flow like Gmail) */}
              <div className="flex-1 overflow-y-auto divide-y divide-border/60 bg-surface">
                {messages.map((msg, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: idx * 0.04 }}
                    key={msg.id} 
                    className="px-8 py-6 flex flex-col"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-4 select-none">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center font-bold text-xs shrink-0 select-none text-text-primary">
                          {cleanEmailSender(msg.from).substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-text-primary block leading-none">
                            {cleanEmailSender(msg.from)}
                          </span>
                          <span className="text-[10px] text-text-tertiary mt-1.5 block leading-none">
                            to {cleanEmailSender(msg.to)}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-text-tertiary font-medium">
                        {formatTime(msg.date)}
                      </span>
                    </div>

                    {/* Isolated Full-Width Email Body Content */}
                    <div className="w-full mt-2 overflow-hidden rounded-xl border border-border/40 shadow-sm bg-white">
                      {msg.body.includes("<html") || msg.body.includes("<body") || msg.body.includes("<div") || msg.body.includes("<table") || msg.body.includes("<p") ? (
                        <EmailIframe htmlContent={msg.body} />
                      ) : (
                        <div className="p-5 text-xs font-medium leading-relaxed whitespace-pre-wrap select-text text-neutral-800 bg-white">
                          {msg.body}
                        </div>
                      )}
                    </div>

                    {/* Attachments badges */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {msg.attachments.map((file) => (
                          <a
                            key={file.id}
                            href={`/api/inbox/attachments?messageId=${msg.id}&attachmentId=${file.id}&filename=${encodeURIComponent(file.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-hover text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-all shadow-sm active:scale-[0.98]"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-text-tertiary" />
                            <span className="truncate max-w-[120px]">{file.name}</span>
                            <span className="text-[9px] text-text-tertiary shrink-0">({formatFileSize(file.size)})</span>
                            <Download className="w-3.5 h-3.5 text-text-tertiary shrink-0 ml-1" />
                          </a>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Inline Thread Reply */}
              <div className="border-t border-border p-4.5 bg-gradient-to-b from-surface/20 to-surface-secondary/20 backdrop-blur-md shrink-0">
                {replyError && (
                  <div className="mb-3 p-3 rounded-xl bg-danger-50 text-danger-600 dark:bg-danger-900/10 dark:text-danger-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{replyError}</span>
                  </div>
                )}

                <form onSubmit={handleReplySubmit} className="space-y-3">
                  <div className="rounded-xl border border-border bg-surface shadow-sm focus-within:ring-4 focus-within:ring-accent-500/5 focus-within:border-accent-500 transition-all duration-200 p-2">
                    <textarea
                      placeholder="Draft a response..."
                      rows={3}
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      className="w-full p-2 text-xs bg-transparent border-none outline-none resize-none text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-0 min-h-[60px]"
                      style={{ border: "none", outline: "none", boxShadow: "none" }}
                    />

                    {/* Attachment queue */}
                    {replyFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 px-2 pb-2">
                        {replyFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full border border-border bg-surface text-[9px] text-text-secondary font-semibold"
                          >
                            <span className="truncate max-w-[110px]">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setReplyFiles((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-text-tertiary hover:text-text-primary p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center px-1 pt-1">
                      <button
                        type="button"
                        onClick={() => replyFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-hover text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-all shadow-sm cursor-pointer"
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
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-semibold transition-all shadow-sm cursor-pointer"
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
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2 bg-gradient-to-b from-surface-secondary/5 to-surface/5">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl border border-dashed border-border bg-surface shadow-sm">
              <InboxIcon className="w-5 h-5 text-text-tertiary" />
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
              className="w-[500px] h-[480px] bg-surface border border-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden"
            >
              {/* Dark minimalist header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-neutral-900 text-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 select-none shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider">New Message</span>
                <button
                  onClick={() => setIsComposeOpen(false)}
                  className="text-neutral-400 hover:text-white transition-colors p-0.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form container */}
              <form onSubmit={handleComposeSubmit} className="flex-1 flex flex-col min-h-0 bg-surface">
                {/* Borderless Fields */}
                <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border/40 text-xs shrink-0">
                  <span className="text-text-tertiary w-12 font-semibold select-none">To</span>
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

                <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border/40 text-xs shrink-0">
                  <span className="text-text-tertiary w-12 font-semibold select-none">Subject</span>
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
