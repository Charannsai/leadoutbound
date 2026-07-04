"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { StatusBadge } from "@/components/common/status-badge";
import { GitBranch, MapPin, Briefcase, ChevronRight, User, ExternalLink, RefreshCw } from "lucide-react";
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
  { id: "qualified", label: "Qualified", border: "border-t-slate-400 dark:border-t-slate-600", activeBg: "bg-slate-500/5 dark:bg-slate-500/10", accentColor: "text-slate-500", tagColor: "bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400" },
  { id: "personalized", label: "Personalized", border: "border-t-blue-400 dark:border-t-blue-600", activeBg: "bg-blue-500/5 dark:bg-blue-500/10", accentColor: "text-blue-500", tagColor: "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400" },
  { id: "approved", label: "Approved", border: "border-t-violet-500 dark:border-t-violet-600", activeBg: "bg-violet-500/5 dark:bg-violet-500/10", accentColor: "text-violet-500", tagColor: "bg-violet-100 dark:bg-violet-900/60 text-violet-600 dark:text-violet-400" },
  { id: "sent", label: "Sent", border: "border-t-amber-500 dark:border-t-amber-600", activeBg: "bg-amber-500/5 dark:bg-amber-500/10", accentColor: "text-amber-500", tagColor: "bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400" },
  { id: "replied", label: "Replied", border: "border-t-emerald-500 dark:border-t-emerald-600", activeBg: "bg-emerald-500/5 dark:bg-emerald-500/10", accentColor: "text-emerald-500", tagColor: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400" },
  { id: "converted", label: "Converted", border: "border-t-teal-600 dark:border-t-teal-500", activeBg: "bg-teal-500/5 dark:bg-teal-500/10", accentColor: "text-teal-600", tagColor: "bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-400" }
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
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {columns.map((col) => (
            <div key={col.id} className="p-3 border border-border bg-surface-secondary/40 rounded-2xl space-y-4 min-h-[450px]">
              <div className="flex justify-between items-center px-1">
                <Skeleton className="h-4.5 w-16" />
                <Skeleton className="h-4.5 w-6 rounded-full" />
              </div>
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const leadsList = leads || [];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden select-none">
      
      {/* Redesigned Clean Header Row */}
      <div className="flex items-center justify-between pb-5 border-b border-border gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">Pipeline Board</h1>
          <p className="text-xs text-text-secondary mt-1">
            Drag and drop lead cards across lifecycle stages to advance campaign outreach flow.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface text-text-secondary hover:text-text-primary text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync
        </button>
      </div>

      {/* Kanban Board Container (Fullscreen Flex scroll area) */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-6 pt-4 min-h-0 items-start scrollbar-thin">
        {columns.map(col => {
          const colLeads = leadsList.filter(l => l.pipelineStage === col.id);
          const isOver = activeDropColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(col.id)}
              className={cn(
                "flex-grow-0 flex-shrink-0 w-[275px] rounded-2xl border border-border border-t-4 flex flex-col h-full bg-surface-secondary/25 transition-all duration-200 shadow-sm",
                col.border,
                isOver ? cn(col.activeBg, "scale-[1.01] border-neutral-300 dark:border-neutral-700") : ""
              )}
            >
              {/* Kanban Column Titlebar */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface/40 backdrop-blur-md rounded-t-2xl shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">
                  {col.label}
                </span>
                <span className={cn(
                  "text-[9px] font-extrabold px-2 py-0.5 rounded-full",
                  col.tagColor
                )}>
                  {colLeads.length}
                </span>
              </div>

              {/* Drop Cards List container */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[300px] scrollbar-thin">
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
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        key={lead.id}
                        draggable
                        onDragStart={() => handleDragStart(lead.id)}
                        className={cn(
                          "p-4 rounded-xl border border-border bg-surface shadow-[0_2px_8px_rgba(0,0,0,0.01)] cursor-grab active:cursor-grabbing hover:border-neutral-450 dark:hover:border-neutral-750 transition-all duration-200 group relative",
                          draggedLeadId === lead.id ? "opacity-30 border-dashed" : ""
                        )}
                      >
                        {/* Upper Section: Company + Qualification Score */}
                        <div className="flex justify-between items-start gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-xs text-text-primary group-hover:text-accent-500 transition-colors truncate">
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
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          {lead.qualificationScore !== null && (
                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 select-none", scoreBadgeColor)}>
                              {score}%
                            </span>
                          )}
                        </div>

                        {/* Separator line */}
                        <div className="h-[1px] bg-border/40 my-3" />

                        {/* Middle Section: Lead details */}
                        <div className="space-y-2 text-[10px]">
                          <div className="flex items-center gap-2 text-text-secondary">
                            <User className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                            <span className="truncate font-semibold text-text-primary">
                              {lead.contactName || "Unknown contact"}
                            </span>
                          </div>
                          {lead.contactTitle && (
                            <div className="flex items-center gap-2 text-text-tertiary">
                              <Briefcase className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                              <span className="truncate">{lead.contactTitle}</span>
                            </div>
                          )}
                          {lead.location && (
                            <div className="flex items-center gap-2 text-text-tertiary">
                              <MapPin className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                              <span className="truncate">{lead.location}</span>
                            </div>
                          )}
                        </div>

                        {/* Footer Section: Session Pill & Quick details Link */}
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border border-dashed select-none">
                          <span className="text-[8px] font-extrabold uppercase tracking-wider text-text-tertiary bg-neutral-100 dark:bg-neutral-800/80 px-2 py-0.5 rounded border border-border/40 truncate max-w-[130px]" title={lead.session.name}>
                            {lead.session.name}
                          </span>
                          <Link
                            href={`/sessions/${lead.sessionId}`}
                            className="inline-flex items-center gap-0.5 text-[9px] font-bold text-accent-500 hover:text-accent-600 transition-colors"
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
                  <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/60 rounded-2xl bg-surface/5">
                    <GitBranch className="w-4.5 h-4.5 text-text-tertiary/40 mb-1" />
                    <span className="text-[10px] font-semibold text-text-tertiary/70">No leads in stage</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
