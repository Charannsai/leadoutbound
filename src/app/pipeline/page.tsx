"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { GitBranch, MapPin, Briefcase, ChevronRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

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
  { id: "qualified", label: "Qualified", color: "border-t-neutral-400 bg-neutral-500/5" },
  { id: "personalized", label: "Personalized", color: "border-t-accent-400 bg-accent-500/5" },
  { id: "approved", label: "Approved", color: "border-t-warning-500 bg-warning-500/5" },
  { id: "sent", label: "Sent", color: "border-t-success-500 bg-success-500/5" },
  { id: "replied", label: "Replied", color: "border-t-accent-500 bg-accent-600/5" },
  { id: "converted", label: "Converted", color: "border-t-success-600 bg-success-600/5" }
];

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const { data: leads, isLoading } = useQuery<PipelineLead[]>({
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow dropping
  };

  const handleDrop = async (stage: string) => {
    if (!draggedLeadId) return;
    updateStage.mutate({ id: draggedLeadId, stage });
    setDraggedLeadId(null);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-32 bg-surface-tertiary rounded mb-2" />
        <div className="h-4 w-64 bg-surface-tertiary rounded mb-8" />
        <div className="flex gap-4 overflow-x-auto">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-1 min-w-[200px] h-[400px] bg-surface-tertiary rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const leadsList = leads || [];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      <PageHeader
        title="Pipeline Board"
        description="Drag and drop leads to advance outreach campaigns"
      />

      {/* Board Columns container */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 mt-2 select-none min-h-0 items-start">
        {columns.map(col => {
          const colLeads = leadsList.filter(l => l.pipelineStage === col.id);

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.id)}
              className={cn(
                "flex-1 min-w-[240px] max-w-[280px] rounded-xl border border-border border-t-2 flex flex-col max-h-full bg-surface-secondary/35",
                col.color
              )}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-border flex items-center justify-between bg-surface/50 backdrop-blur shrink-0 rounded-t-xl">
                <span className="text-xs font-semibold text-text-primary">{col.label}</span>
                <span className="text-[10px] bg-surface-tertiary text-text-secondary px-2 py-0.5 rounded-full font-bold">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[250px]">
                {colLeads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => handleDragStart(lead.id)}
                    className={cn(
                      "p-3 rounded-lg border border-border bg-surface shadow-sm cursor-grab active:cursor-grabbing hover:border-accent-500/20 hover:shadow transition-all group",
                      draggedLeadId === lead.id ? "opacity-50" : ""
                    )}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-semibold text-xs text-text-primary group-hover:text-accent-500 transition-colors">
                        {lead.companyName}
                      </span>
                      {lead.qualificationScore && (
                        <span className="text-[9px] font-bold text-accent-500 bg-accent-500/5 px-1.5 py-0.5 rounded">
                          {lead.qualificationScore}%
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mt-2 text-[10px] text-text-secondary">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-text-tertiary" />
                        <span className="truncate">{lead.contactName || "No contact"}</span>
                      </div>
                      {lead.contactTitle && (
                        <div className="flex items-center gap-1 pl-4 text-text-tertiary truncate">
                          {lead.contactTitle}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-[9px] text-text-tertiary mt-2">
                        <span className="truncate font-semibold uppercase tracking-wider">{lead.session.name.slice(0, 18)}...</span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 mt-1.5 border-t border-border border-dashed">
                      <Link
                        href={`/sessions/${lead.sessionId}`}
                        className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-accent-500 hover:text-accent-600"
                      >
                        Session <ChevronRight className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  </div>
                ))}

                {colLeads.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border/60 rounded-lg">
                    <GitBranch className="w-4 h-4 text-text-tertiary/50 mb-1" />
                    <span className="text-[10px] text-text-tertiary/75">Empty column</span>
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
