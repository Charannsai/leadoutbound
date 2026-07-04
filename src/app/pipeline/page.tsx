"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, MapPin, Briefcase, ChevronRight, User, ExternalLink, RefreshCw, Layers, Zap, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import { CardSkeleton, Skeleton } from "@/components/common/skeletons";

interface PipelineLead {
  id: string;
  companyName: string;
  companyWebsite: string | null;
  location: string | null;
  contactName: string | null;
  contactTitle: string | null;
  pipelineStage: string;
  qualificationScore: number | null;
  sessionId: string;
  session: { name: string };
}

// 3 Curated Phases grouping the 6 stages logically
const phases = [
  {
    name: "Discovery & Qualification",
    description: "Leads identified and tailored for outbound campaigns",
    columns: [
      { id: "qualified", label: "Qualified Leads", border: "border-t-slate-400 dark:border-t-slate-600", activeBg: "bg-slate-500/5 dark:bg-slate-500/10", accentColor: "text-slate-500", tagColor: "bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400" },
      { id: "personalized", label: "AI Personalized", border: "border-t-blue-400 dark:border-t-blue-600", activeBg: "bg-blue-500/5 dark:bg-blue-500/10", accentColor: "text-blue-500", tagColor: "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400" }
    ]
  },
  {
    name: "Execution & Delivery",
    description: "Approve draft messages and track sent deliveries",
    columns: [
      { id: "approved", label: "Approved Drafts", border: "border-t-violet-500 dark:border-t-violet-600", activeBg: "bg-violet-500/5 dark:bg-violet-500/10", accentColor: "text-violet-500", tagColor: "bg-violet-100 dark:bg-violet-900/60 text-violet-600 dark:text-violet-400" },
      { id: "sent", label: "Sent Emails", border: "border-t-amber-500 dark:border-t-amber-600", activeBg: "bg-amber-500/5 dark:bg-amber-500/10", accentColor: "text-amber-500", tagColor: "bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400" }
    ]
  },
  {
    name: "Response & Conversion",
    description: "Inspect responses and finalize lead conversions",
    columns: [
      { id: "replied", label: "Replied Leads", border: "border-t-emerald-500 dark:border-t-emerald-600", activeBg: "bg-emerald-500/5 dark:bg-emerald-500/10", accentColor: "text-emerald-500", tagColor: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400" },
      { id: "converted", label: "Converted Contacts", border: "border-t-teal-600 dark:border-t-teal-500", activeBg: "bg-teal-500/5 dark:bg-teal-500/10", accentColor: "text-teal-600", tagColor: "bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-400" }
    ]
  }
];

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<string | null>(null);

  const { data: leads, isLoading, refetch } = useQuery<PipelineLead[]>({
    queryKey: ["pipeline"],
    queryFn: async () => {
      const res = await fetch("/api/pipeline");
      if (!res.ok) throw new Error("Failed to fetch pipeline leads");
      return res.json();
    }
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: stage })
      });
      if (!res.ok) throw new Error("Failed to update stage");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  const handleDragStart = (id: string) => {
    setDraggedLeadId(id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setActiveDropColumn(columnId);
  };

  const handleDragLeave = () => {
    setActiveDropColumn(null);
  };

  const handleDrop = async (stage: string) => {
    if (!draggedLeadId) return;
    updateStage.mutate({ id: draggedLeadId, stage });
    setDraggedLeadId(null);
    setActiveDropColumn(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 select-none">
        <div className="flex justify-between items-end">
          <div>
            <Skeleton className="h-7 w-36 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((p) => (
            <div key={p} className="space-y-4">
              <Skeleton className="h-5 w-40" />
              <div className="h-52 bg-surface-secondary/40 border border-border rounded-2xl animate-pulse" />
              <div className="h-52 bg-surface-secondary/40 border border-border rounded-2xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const leadsList = leads || [];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden select-none">
      
      {/* Header section */}
      <div className="flex items-center justify-between pb-5 border-b border-border gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">Campaign Lifecycle Pipeline</h1>
          <p className="text-xs text-text-secondary mt-1">
            Grouped by process phases. Drag and drop cards vertically or across sections to progress outreach status.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-surface text-text-secondary hover:text-text-primary text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync Board
        </button>
      </div>

      {/* Redesigned 3-Phase Column Layout (Fits viewport cleanly) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 min-h-0">
        {phases.map((phase, idx) => (
          <div key={idx} className="flex flex-col h-full min-h-0 space-y-4 border border-border/40 p-4 rounded-3xl bg-neutral-50/10 dark:bg-neutral-900/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            
            {/* Phase header information block */}
            <div className="shrink-0">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-text-tertiary bg-surface-secondary border border-border px-2 py-0.5 rounded-full">
                Phase {idx + 1}
              </span>
              <h3 className="text-xs font-bold text-text-primary mt-2 flex items-center gap-1.5">
                {idx === 0 && <Layers className="w-3.5 h-3.5 text-slate-500" />}
                {idx === 1 && <Zap className="w-3.5 h-3.5 text-violet-500" />}
                {idx === 2 && <CheckCircle className="w-3.5 h-3.5 text-teal-500" />}
                {phase.name}
              </h3>
              <p className="text-[10px] text-text-tertiary mt-1.5 leading-snug">
                {phase.description}
              </p>
            </div>

            {/* Split Stages container (50/50 vertical division) */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {phase.columns.map(col => {
                const colLeads = leadsList.filter(l => l.pipelineStage === col.id);
                const isOver = activeDropColumn === col.id;

                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => handleDragOver(e, col.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(col.id)}
                    className={cn(
                      "flex-1 flex flex-col rounded-2xl border border-border border-t-2 bg-surface overflow-hidden transition-all duration-200 min-h-0 shadow-sm",
                      col.border,
                      isOver ? cn(col.activeBg, "scale-[1.01] border-neutral-300 dark:border-neutral-700") : ""
                    )}
                  >
                    {/* Header */}
                    <div className="px-3.5 py-2 border-b border-border flex items-center justify-between bg-surface-secondary/40 shrink-0">
                      <span className="text-[10px] font-bold text-text-secondary select-none">
                        {col.label}
                      </span>
                      <span className={cn(
                        "text-[9px] font-extrabold px-2 py-0.5 rounded-full",
                        col.tagColor
                      )}>
                        {colLeads.length}
                      </span>
                    </div>

                    {/* Scrollable list of leads in stage */}
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-thin bg-surface-secondary/15">
                      <AnimatePresence initial={false}>
                        {colLeads.map(lead => {
                          const score = lead.qualificationScore || 0;
                          let scoreBadgeColor = "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-450";
                          if (score >= 80) {
                            scoreBadgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
                          } else if (score >= 50) {
                            scoreBadgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
                          }

                          return (
                            <motion.div
                              layout
                              initial={{ opacity: 0, scale: 0.96 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.96 }}
                              transition={{ duration: 0.15 }}
                              key={lead.id}
                              draggable
                              onDragStart={() => handleDragStart(lead.id)}
                              className={cn(
                                "p-3 rounded-xl border border-border bg-surface shadow-[0_1px_4px_rgba(0,0,0,0.005)] cursor-grab active:cursor-grabbing hover:border-neutral-400 dark:hover:border-neutral-800 transition-all duration-200 group relative",
                                draggedLeadId === lead.id ? "opacity-30 border-dashed" : ""
                              )}
                            >
                              {/* Title block */}
                              <div className="flex justify-between items-start gap-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-bold text-[11px] text-text-primary group-hover:text-accent-500 transition-colors truncate">
                                    {lead.companyName}
                                  </span>
                                  {lead.companyWebsite && (
                                    <a
                                      href={lead.companyWebsite}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-text-tertiary hover:text-text-secondary inline-block"
                                      title="Visit company website"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                                {lead.qualificationScore !== null && (
                                  <span className={cn("text-[8px] font-bold px-1 py-0.5 rounded shrink-0", scoreBadgeColor)}>
                                    {score}%
                                  </span>
                                )}
                              </div>

                              {/* Details stack */}
                              <div className="space-y-1.5 mt-2.5 text-[9px] text-text-secondary">
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3 h-3 text-text-tertiary shrink-0" />
                                  <span className="truncate font-semibold text-text-primary">
                                    {lead.contactName || "No contact info"}
                                  </span>
                                </div>
                                {lead.contactTitle && (
                                  <div className="flex items-center gap-1.5 pl-4.5 text-text-tertiary truncate leading-none">
                                    {lead.contactTitle}
                                  </div>
                                )}
                              </div>

                              {/* Card footer */}
                              <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-border/40 border-dashed select-none">
                                <span className="text-[7.5px] font-bold uppercase tracking-wider text-text-tertiary bg-neutral-100 dark:bg-neutral-850 px-1.5 py-0.5 rounded border border-border/40 truncate max-w-[120px]" title={lead.session.name}>
                                  {lead.session.name}
                                </span>
                                <Link
                                  href={`/sessions/${lead.sessionId}`}
                                  className="inline-flex items-center gap-0.5 text-[8.5px] font-bold text-accent-500 hover:text-accent-600 transition-colors"
                                >
                                  Session
                                  <ChevronRight className="w-2.5 h-2.5" />
                                </Link>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      {colLeads.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-border/50 rounded-xl bg-surface/5">
                          <GitBranch className="w-3.5 h-3.5 text-text-tertiary/40 mb-1" />
                          <span className="text-[9px] font-semibold text-text-tertiary/65">No leads</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
