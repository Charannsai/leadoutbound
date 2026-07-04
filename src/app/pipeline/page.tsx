"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, MapPin, Briefcase, ChevronRight, User, ExternalLink, RefreshCw, ChevronLeft, ArrowRight, Zap, Target } from "lucide-react";
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

const columns = [
  { id: "qualified", step: "01", label: "Qualified", desc: "Discovered Leads", activeBorder: "border-slate-500", activeBg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400" },
  { id: "personalized", step: "02", label: "Personalized", desc: "AI Draft Ready", activeBorder: "border-blue-500", activeBg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  { id: "approved", step: "03", label: "Approved", desc: "Outbox Queue", activeBorder: "border-violet-500", activeBg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" },
  { id: "sent", step: "04", label: "Sent", desc: "Dispatched Pitch", activeBorder: "border-amber-500", activeBg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  { id: "replied", step: "05", label: "Replied", desc: "Incoming Response", activeBorder: "border-emerald-500", activeBg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  { id: "converted", step: "06", label: "Converted", desc: "Deal Finalized", activeBorder: "border-teal-500", activeBg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400" }
];

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const [activeStage, setActiveStage] = useState<string>("qualified");
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

  const handleAdvance = (leadId: string, currentStage: string, direction: "next" | "prev") => {
    const currentIndex = columns.findIndex((c) => c.id === currentStage);
    let nextIndex = currentIndex;
    if (direction === "next" && currentIndex < columns.length - 1) {
      nextIndex += 1;
    } else if (direction === "prev" && currentIndex > 0) {
      nextIndex -= 1;
    }
    
    if (nextIndex !== currentIndex) {
      updateStage.mutate({ id: leadId, stage: columns[nextIndex].id });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 select-none animate-pulse">
        <div className="flex justify-between items-end">
          <div>
            <Skeleton className="h-7 w-36 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="h-20 bg-surface-secondary/40 rounded-2xl mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const leadsList = leads || [];
  const activeColLeads = leadsList.filter((l) => l.pipelineStage === activeStage);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden select-none">
      
      {/* Header section */}
      <div className="flex items-center justify-between pb-5 border-b border-border gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">Outbound Pipeline Flow</h1>
          <p className="text-xs text-text-secondary mt-1">
            Click nodes to browse stage lists. Drag lead cards and drop them onto top workflow tabs to update their lifecycle status.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-surface text-text-secondary hover:text-text-primary text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Pipeline
        </button>
      </div>

      {/* 1. Timeline progression track (macOS dock style horizontal progression) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-6 shrink-0 bg-surface-secondary/40 border border-border/80 p-2 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        {columns.map((col) => {
          const colLeads = leadsList.filter((l) => l.pipelineStage === col.id);
          const isCurrent = activeStage === col.id;
          const isOver = activeDropColumn === col.id;

          return (
            <div
              key={col.id}
              onClick={() => setActiveStage(col.id)}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(col.id)}
              className={cn(
                "relative p-3.5 rounded-xl border border-transparent transition-all duration-200 cursor-pointer select-none text-left flex flex-col justify-between min-h-[72px]",
                isCurrent
                  ? "bg-surface border-border shadow-[0_4px_12px_rgba(0,0,0,0.03)] border-b-2"
                  : "hover:bg-surface/50",
                isOver ? cn("scale-105 border-dashed border-2", col.activeBorder, col.activeBg) : ""
              )}
            >
              {/* Top border active indicator */}
              {isCurrent && (
                <motion.span
                  layoutId="activeTimelineBorder"
                  className={cn("absolute top-0 left-4 right-4 h-0.5 rounded-full", col.id === "qualified" ? "bg-slate-500" : col.id === "personalized" ? "bg-blue-500" : col.id === "approved" ? "bg-violet-500" : col.id === "sent" ? "bg-amber-500" : col.id === "replied" ? "bg-emerald-500" : "bg-teal-500")}
                />
              )}

              <div className="flex items-center justify-between w-full">
                <span className="text-[8px] font-extrabold text-text-tertiary tracking-widest">{col.step}</span>
                <span className={cn(
                  "text-[9px] font-bold px-2 py-0.5 rounded-full",
                  colLeads.length > 0 ? col.tagColor : "bg-neutral-100 dark:bg-neutral-900 text-text-tertiary"
                )}>
                  {colLeads.length}
                </span>
              </div>

              <div className="mt-2.5">
                <h4 className={cn("text-xs font-bold leading-none truncate", isCurrent ? "text-text-primary" : "text-text-secondary")}>
                  {col.label}
                </h4>
                <p className="text-[9px] text-text-tertiary mt-1 leading-none truncate">{col.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Spacious Leads Grid Area (No squished columns) */}
      <div className="flex-1 mt-6 min-h-0 flex flex-col">
        <div className="flex items-center gap-2 mb-3.5 shrink-0 select-none">
          <Target className="w-4 h-4 text-text-tertiary" />
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            {columns.find((c) => c.id === activeStage)?.label} List Details ({activeColLeads.length} lead{activeColLeads.length === 1 ? "" : "s"})
          </span>
        </div>

        {activeColLeads.length > 0 ? (
          <div className="flex-1 overflow-y-auto pr-1 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
                {activeColLeads.map((lead) => {
                  const score = lead.qualificationScore || 0;
                  let scoreColor = "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-450";
                  if (score >= 80) {
                    scoreColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
                  } else if (score >= 50) {
                    scoreColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
                  }

                  const isFirstStage = activeStage === "qualified";
                  const isLastStage = activeStage === "converted";

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.96, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -10 }}
                      transition={{ duration: 0.18 }}
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead.id)}
                      className={cn(
                        "p-5 rounded-2xl border border-border bg-surface shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:border-neutral-400 dark:hover:border-neutral-800 hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all duration-200 flex flex-col justify-between group cursor-grab active:cursor-grabbing",
                        draggedLeadId === lead.id ? "opacity-30 border-dashed" : ""
                      )}
                    >
                      <div>
                        {/* Upper row */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-sm text-text-primary group-hover:text-accent-500 transition-colors truncate">
                              {lead.companyName}
                            </span>
                            {lead.companyWebsite && (
                              <a
                                href={lead.companyWebsite}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-text-tertiary hover:text-text-secondary inline-block shrink-0"
                                title="Visit company website"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          {lead.qualificationScore !== null && (
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded shrink-0 select-none", scoreColor)}>
                              {score}%
                            </span>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="h-[1px] bg-border/40 my-3.5" />

                        {/* Contact details */}
                        <div className="space-y-2.5 text-xs">
                          <div className="flex items-center gap-2 text-text-secondary">
                            <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center font-bold text-[10px] text-text-secondary select-none">
                              {(lead.contactName || "U")[0].toUpperCase()}
                            </div>
                            <span className="truncate font-semibold text-text-primary">
                              {lead.contactName || "No contact identified"}
                            </span>
                          </div>
                          {lead.contactTitle && (
                            <div className="flex items-center gap-2 text-text-tertiary">
                              <Briefcase className="w-4 h-4 shrink-0 text-text-tertiary" />
                              <span className="truncate">{lead.contactTitle}</span>
                            </div>
                          )}
                          {lead.location && (
                            <div className="flex items-center gap-2 text-text-tertiary">
                              <MapPin className="w-4 h-4 shrink-0 text-text-tertiary" />
                              <span className="truncate">{lead.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions block */}
                      <div className="flex items-center justify-between pt-4 mt-5 border-t border-border/40 border-dashed">
                        {/* Session link */}
                        <span className="text-[8px] font-extrabold uppercase tracking-wider text-text-tertiary bg-surface-secondary border border-border/60 px-2.5 py-1 rounded truncate max-w-[140px]" title={lead.session.name}>
                          {lead.session.name}
                        </span>

                        {/* Progression trigger button bar */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAdvance(lead.id, lead.pipelineStage, "prev"); }}
                            disabled={isFirstStage}
                            className="p-1 rounded-lg border border-border/60 bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                            title="Move back a stage"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          
                          <Link
                            href={`/sessions/${lead.sessionId}`}
                            className="px-2.5 py-1 rounded-lg border border-border/60 bg-surface hover:bg-surface-hover text-[9px] font-bold text-text-secondary hover:text-text-primary transition-all text-center select-none"
                          >
                            Details
                          </Link>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleAdvance(lead.id, lead.pipelineStage, "next"); }}
                            disabled={isLastStage}
                            className="p-1 rounded-lg border border-border/60 bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                            title="Advance to next stage"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center py-24 text-center border border-dashed border-border/60 rounded-3xl bg-surface-secondary/15">
            <GitBranch className="w-9 h-9 text-text-tertiary/40 mb-3" />
            <h3 className="text-sm font-semibold text-text-primary">Stage is empty</h3>
            <p className="text-xs text-text-tertiary mt-1.5 max-w-[240px] leading-relaxed mx-auto">
              No leads currently exist in {columns.find((c) => c.id === activeStage)?.label}. Drag cards here or use control triggers to move leads.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
