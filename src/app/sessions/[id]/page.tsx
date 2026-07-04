"use client";

import { useState, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, useUpdateSession } from "@/hooks/use-sessions";
import { PageHeader } from "@/components/common/page-header";
import { Modal } from "@/components/common/modal";
import { StatusBadge } from "@/components/common/status-badge";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  Mail,
  MessageSquare,
  Clock,
  Edit3,
  Check,
  X,
  FileText,
  BarChart3,
  Play,
  Send,
  Loader2,
  Trash2,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

type TabId = "overview" | "leads" | "emails" | "analytics";

interface Lead {
  id: string;
  companyName: string;
  companyWebsite: string | null;
  companySize: string | null;
  industry: string | null;
  location: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactTitle: string | null;
  contactLinkedin: string | null;
  qualificationScore: number | null;
  qualificationReason: string | null;
  applyDirect?: boolean;
  pipelineStage: string;
  emails: LeadEmail[];
}

interface LeadEmail {
  id: string;
  subject: string;
  body: string;
  status: string;
  sentAt: string | null;
  aiReasoning: string | null;
  attachments?: string | null;
}

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useSession(id);
  const updateSession = useUpdateSession();
  
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  
  // Review Queue state
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [selectedAttachments, setSelectedAttachments] = useState<Array<{ id: string; name: string }>>([]);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [discardLeadId, setDiscardLeadId] = useState<string | null>(null);
  
  const { data: kbData } = useQuery<{ entries: any[]; files: any[] }>({
    queryKey: ["knowledge"],
    queryFn: async () => {
      const res = await fetch("/api/knowledge");
      if (!res.ok) throw new Error("Failed to fetch knowledge");
      return res.json();
    }
  });
  const kbFiles = kbData?.files || [];

  // Button spinners
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const isLinkedin = session?.outboundChannel === "linkedin";

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "leads", label: "Leads", icon: Users },
    { id: "emails", label: isLinkedin ? "LinkedIn Notes" : "Emails", icon: isLinkedin ? MessageSquare : Mail },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-24 bg-surface-tertiary rounded mb-6" />
        <div className="h-8 w-64 bg-surface-tertiary rounded mb-2" />
        <div className="h-4 w-96 bg-surface-tertiary rounded mb-8" />
        <div className="h-[400px] bg-surface-tertiary rounded-xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">Session not found</p>
        <Link href="/sessions" className="text-sm text-accent-500 hover:underline mt-2 inline-block">
          Back to sessions
        </Link>
      </div>
    );
  }

  const leads = (session.leads || []) as Lead[];
  const qualifiedLeads = leads.filter(l => l.pipelineStage === "qualified");
  const personalizedLeads = leads.filter(l => ["personalized", "approved"].includes(l.pipelineStage));
  const approvedLeads = leads.filter(l => l.pipelineStage === "approved");

  const handleSaveName = () => {
    if (editName.trim() && editName !== session.name) {
      updateSession.mutate({ id: session.id, name: editName.trim() });
    }
    setIsEditingName(false);
  };

  const handlePersonalizeAll = async () => {
    setIsPersonalizing(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/personalize`, { method: "POST" });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["session", session.id] });
        setActiveTab("emails");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPersonalizing(false);
    }
  };

  const handleSendEmails = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/send`, { method: "POST" });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["session", session.id] });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const selectLeadForReview = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    const draft = lead.emails?.[0];
    if (draft) {
      setEditSubject(draft.subject);
      setEditBody(draft.body);
      let atts = [];
      if (draft.attachments) {
        try {
          atts = JSON.parse(draft.attachments) || [];
        } catch {}
      }
      setSelectedAttachments(atts);
    } else {
      setEditSubject("");
      setEditBody("");
      setSelectedAttachments([]);
    }
  };

  const handleSaveEmail = async (lead: Lead) => {
    const draft = lead.emails?.[0];
    if (!draft) return;
    
    setIsSavingEmail(true);
    try {
      const res = await fetch(`/api/emails/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          subject: editSubject, 
          body: editBody,
          attachments: JSON.stringify(selectedAttachments)
        })
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["session", session.id] });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleApproveEmail = async (lead: Lead) => {
    const draft = lead.emails?.[0];
    if (!draft) return;

    try {
      const res = await fetch(`/api/emails/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "approved",
          subject: editSubject,
          body: editBody,
          attachments: JSON.stringify(selectedAttachments)
        })
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["session", session.id] });
        // Auto select next email
        const currentIndex = personalizedLeads.findIndex(l => l.id === lead.id);
        if (currentIndex !== -1 && currentIndex + 1 < personalizedLeads.length) {
          selectLeadForReview(personalizedLeads[currentIndex + 1]);
        } else {
          setSelectedLeadId(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveAll = async () => {
    const draftsToApprove = personalizedLeads.filter(l => l.emails?.[0]?.status === "draft");
    if (draftsToApprove.length === 0) return;

    try {
      const promises = draftsToApprove.map(l => 
        fetch(`/api/emails/${l.emails[0].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" })
        })
      );
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ["session", session.id] });
      setSelectedLeadId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDiscardLead = async (leadId: string) => {
    setDiscardLeadId(leadId);
  };

  const executeDiscardLead = async (leadId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["session", session.id] });
        if (selectedLeadId === leadId) setSelectedLeadId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
      {/* Back Link */}
      <motion.div variants={fadeUp}>
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Sessions
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={fadeUp} className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  className={cn(
                    "text-2xl font-semibold tracking-tight px-2 py-0.5 rounded-lg border",
                    "bg-surface border-accent-500 text-text-primary",
                    "focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                  )}
                  autoFocus
                />
                <button onClick={handleSaveName} className="p-1 rounded hover:bg-success-50 text-success-500">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setIsEditingName(false)} className="p-1 rounded hover:bg-surface-hover text-text-tertiary">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
                  {session.name}
                </h1>
                <button
                  onClick={() => {
                    setEditName(session.name);
                    setIsEditingName(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-hover text-text-tertiary transition-opacity"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-sm text-text-secondary mt-1">{session.searchQuery}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={session.status} />
            
            {/* Context Actions */}
            {(session.status === "qualifying" || session.status === "personalizing") && (
              <button
                onClick={handlePersonalizeAll}
                disabled={isPersonalizing || session.status === "personalizing" || qualifiedLeads.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 transition-colors"
              >
                {isPersonalizing || session.status === "personalizing" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {isPersonalizing || session.status === "personalizing" ? "Personalizing..." : `Personalize (${qualifiedLeads.length})`}
              </button>
            )}

            {session.status === "reviewing" && (
              <div className="flex gap-2">
                {personalizedLeads.length > 0 && (
                  <button
                    onClick={handlePersonalizeAll}
                    disabled={isPersonalizing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-surface text-text-primary hover:bg-surface-hover transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate Drafts
                  </button>
                )}
                <button
                  onClick={handleSendEmails}
                  disabled={isSending || approvedLeads.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-success-600 text-white hover:bg-success-700 disabled:opacity-50 transition-colors"
                >
                  {isSending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Send Approved ({approvedLeads.length})
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-3 mb-6">
        <div className="px-4 py-3 rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-text-tertiary" />
            <span className="text-xs text-text-secondary">Leads Discovered</span>
          </div>
          <p className="text-lg font-semibold text-text-primary">{leads.length}</p>
        </div>
        <div className="px-4 py-3 rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-1.5 mb-1">
            <Mail className="w-3.5 h-3.5 text-text-tertiary" />
            <span className="text-xs text-text-secondary">Emails Drafted</span>
          </div>
          <p className="text-lg font-semibold text-text-primary">{personalizedLeads.length}</p>
        </div>
        <div className="px-4 py-3 rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-text-tertiary" />
            <span className="text-xs text-text-secondary">Approved Drafts</span>
          </div>
          <p className="text-lg font-semibold text-text-primary">{approvedLeads.length}</p>
        </div>
        <div className="px-4 py-3 rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-text-tertiary" />
            <span className="text-xs text-text-secondary">Sent / Replied</span>
          </div>
          <p className="text-lg font-semibold text-text-primary">{session.emailsSent} / {session.repliesCount}</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="mb-6">
        <div className="flex items-center gap-1 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-150",
                activeTab === tab.id
                  ? "border-accent-500 text-accent-500"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div variants={fadeUp}>
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-border bg-surface bg-surface-secondary/50">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Search Definition</h3>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{session.searchQuery}</p>
            </div>
            {session.description && (
              <div className="p-4 rounded-xl border border-border bg-surface">
                <h3 className="text-sm font-semibold text-text-primary mb-2">Session Notes</h3>
                <p className="text-sm text-text-secondary">{session.description}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "leads" && (
          <div className="space-y-3">
            {leads.length > 0 ? (
              <div className="border border-border rounded-xl overflow-hidden bg-surface divide-y divide-border">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-text-primary">{lead.companyName}</span>
                        {lead.companyWebsite && (
                          <a
                            href={lead.companyWebsite}
                            target="_blank"
                            rel="noreferrer"
                            className="text-text-tertiary hover:text-accent-500 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <span className="text-text-tertiary">·</span>
                        <span className="text-xs text-text-secondary font-medium">{lead.location}</span>
                        {lead.applyDirect && (
                          <span className="text-[9px] px-1.5 py-0.5 font-bold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wide">
                            Apply Directly
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-text-secondary">
                        <span className="font-medium text-text-primary">{lead.contactName || "No Contact"}</span>
                        {lead.contactTitle && ` (${lead.contactTitle})`}
                      </div>

                      {lead.qualificationReason && (
                        <div className="text-xs text-text-tertiary bg-surface-secondary px-2.5 py-1.5 rounded-lg max-w-xl mt-1.5 border border-border">
                          <span className="font-semibold text-text-secondary mr-1">AI Reason ({lead.qualificationScore}% Match):</span>
                          {lead.qualificationReason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={lead.pipelineStage} />
                      <button
                        onClick={() => handleDiscardLead(lead.id)}
                        className="p-2 rounded-lg border border-transparent hover:border-danger-500/10 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-500/10 transition-all text-text-tertiary"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-text-secondary text-sm">
                No leads found. Launch a search query to discover targets.
              </div>
            )}
          </div>
        )}

        {activeTab === "emails" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[500px]">
            {/* List side */}
            <div className="md:col-span-1 border border-border rounded-xl bg-surface overflow-y-auto divide-y divide-border">
              <div className="p-3 flex justify-between items-center bg-surface-secondary/50 border-b border-border sticky top-0 backdrop-blur z-10">
                <span className="text-xs font-semibold text-text-secondary">Outreach Queue ({personalizedLeads.length})</span>
                {personalizedLeads.length > 0 && (
                  <button
                    onClick={handleApproveAll}
                    className="text-[10px] font-bold text-accent-500 hover:text-accent-600 transition-colors uppercase tracking-wider"
                  >
                    Approve All
                  </button>
                )}
              </div>

              {personalizedLeads.map((lead) => {
                const draft = lead.emails?.[0];
                const isSelected = selectedLeadId === lead.id;
                return (
                  <button
                    key={lead.id}
                    onClick={() => selectLeadForReview(lead)}
                    className={cn(
                      "w-full text-left p-3.5 transition-all duration-150 flex items-start justify-between gap-2.5",
                      isSelected ? "bg-accent-500/5 dark:bg-accent-900/10 border-l-4 border-accent-500" : "hover:bg-surface-hover"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="font-semibold text-xs text-text-primary truncate">{lead.companyName}</span>
                        {draft && <StatusBadge status={draft.status} className="scale-90" />}
                      </div>
                      <p className="text-[11px] text-text-secondary truncate font-medium">To: {lead.contactName}</p>
                      <p className="text-[11px] text-text-tertiary truncate mt-0.5">{draft?.subject}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-text-tertiary shrink-0 self-center" />
                  </button>
                );
              })}

              {personalizedLeads.length === 0 && (
                <div className="text-center py-20 text-xs text-text-tertiary">
                  No drafts generated. Click &ldquo;Personalize&rdquo; in actions block when leads are qualified.
                </div>
              )}
            </div>

            {/* Preview/Editor side */}
            <div className="md:col-span-2 border border-border rounded-xl bg-surface p-5 flex flex-col h-full overflow-hidden">
              {selectedLeadId ? (
                (() => {
                  const lead = personalizedLeads.find(l => l.id === selectedLeadId);
                  const draft = lead?.emails?.[0];
                  if (!lead || !draft) return null;

                  return (
                    <div className="flex flex-col h-full gap-4 min-w-0">
                      <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
                        <div>
                          <span className="text-xs font-medium text-text-secondary">Drafting context:</span>
                          <h4 className="text-sm font-semibold text-text-primary mt-0.5">{lead.companyName}</h4>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleSaveEmail(lead)}
                            disabled={isSavingEmail}
                            className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-text-primary hover:bg-surface-hover transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => handleApproveEmail(lead)}
                            className="px-3 py-1.5 bg-accent-500 text-white rounded-lg text-xs font-semibold hover:bg-accent-600 transition-colors"
                          >
                            Approve
                          </button>
                        </div>
                      </div>

                      {draft.aiReasoning && (
                        <div className="text-[11px] text-accent-600 bg-accent-500/5 border border-accent-500/20 px-3 py-2 rounded-lg shrink-0">
                          <span className="font-bold">AI Pitch Reason:</span> {draft.aiReasoning}
                        </div>
                      )}

                      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
                        <div>
                          <label className="block text-[11px] font-medium text-text-secondary uppercase mb-1">Subject</label>
                          <input
                            type="text"
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-500 bg-surface-secondary"
                          />
                        </div>

                        <div className="h-[220px] flex flex-col">
                          <label className="block text-[11px] font-medium text-text-secondary uppercase mb-1">Body</label>
                          <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            className="w-full flex-1 px-3 py-2.5 border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-500 bg-surface-secondary resize-none font-mono"
                          />
                        </div>

                        {/* Attachments Section */}
                        <div className="space-y-2 pt-2">
                          <label className="block text-[11px] font-medium text-text-secondary uppercase">Attachments</label>
                          {kbFiles.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {kbFiles.map((file) => {
                                const isAttached = selectedAttachments.some(att => att.id === file.id);
                                return (
                                  <button
                                    key={file.id}
                                    type="button"
                                    onClick={() => {
                                      if (isAttached) {
                                        setSelectedAttachments(prev => prev.filter(att => att.id !== file.id));
                                      } else {
                                        setSelectedAttachments(prev => [...prev, { id: file.id, name: file.name }]);
                                      }
                                    }}
                                    className={cn(
                                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer select-none",
                                      isAttached
                                        ? "bg-accent-500/10 border-accent-500/30 text-accent-500"
                                        : "bg-surface-secondary border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                                    )}
                                  >
                                    <span className="text-xs">📎</span>
                                    <span>{file.name}</span>
                                    {isAttached && <span className="ml-1 text-[8px] bg-accent-500 text-white rounded-full w-3 h-3 flex items-center justify-center">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[10px] text-text-tertiary">
                              No files uploaded in your Knowledge Base. Go to settings or knowledge page to upload a resume/portfolio.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-text-tertiary">
                  <Mail className="w-8 h-8 mb-3" />
                  <p className="text-xs">Select an email draft from the left panel to review, edit, and approve.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border bg-surface">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Conversion Funnel</h3>
              <div className="space-y-3">
                <FunnelRow label="Total Discovered" count={leads.length} percent={100} />
                <FunnelRow label="AI Qualified" count={leads.filter(l => l.pipelineStage !== "rejected").length} percent={leads.length ? Math.round((leads.filter(l => l.pipelineStage !== "rejected").length / leads.length) * 100) : 0} />
                <FunnelRow label="Personalized" count={personalizedLeads.length} percent={leads.length ? Math.round((personalizedLeads.length / leads.length) * 100) : 0} />
                <FunnelRow label="Emails Sent" count={session.emailsSent} percent={personalizedLeads.length ? Math.round((session.emailsSent / personalizedLeads.length) * 100) : 0} />
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-surface flex flex-col items-center justify-center text-center">
              <MessageSquare className="w-8 h-8 text-accent-500 mb-3" />
              <h3 className="text-sm font-semibold text-text-primary mb-1">Reply Tracking</h3>
              <p className="text-xs text-text-secondary max-w-xs mb-4">Replies are fetched directly from your Gmail account and categorized in real-time.</p>
              <div className="flex gap-6 text-xs text-text-primary font-medium">
                <div>
                  <span className="text-text-tertiary block">Replies</span>
                  <span className="text-base font-semibold">{session.repliesCount}</span>
                </div>
                <div className="border-l border-border h-8 self-center" />
                <div>
                  <span className="text-text-tertiary block">Reply Rate</span>
                  <span className="text-base font-semibold">
                    {session.emailsSent > 0 ? ((session.repliesCount / session.emailsSent) * 100).toFixed(1) : "0.0"}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <Modal
        isOpen={discardLeadId !== null}
        onClose={() => setDiscardLeadId(null)}
        onConfirm={() => {
          if (discardLeadId) {
            executeDiscardLead(discardLeadId);
          }
        }}
        title="Discard Lead"
        description="Are you sure you want to discard this lead? It will be removed from your campaign session."
        confirmText="Discard"
        isDanger={true}
      />
    </motion.div>
  );
}

function FunnelRow({ label, count, percent }: { label: string; count: number; percent: number }) {
  return (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between font-medium">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary">{count} ({percent}%)</span>
      </div>
      <div className="w-full bg-surface-tertiary h-1.5 rounded-full overflow-hidden">
        <div className="bg-accent-500 h-full rounded-full" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
