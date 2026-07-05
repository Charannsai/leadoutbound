"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  Plus,
  Trash2,
  TrendingUp,
  Award,
  Clock,
  ArrowRight,
  Sparkles,
  User,
  X,
  Layers,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Deal {
  id: string;
  name: string;
  amount: number;
  stage: string;
  leadId: string;
  lead: {
    contactName: string;
    companyName: string;
    location: string;
  };
}

const pipelineStages = [
  { id: "prospecting", name: "Prospecting", color: "border-t-blue-500 bg-blue-500/5 text-blue-500" },
  { id: "qualified", name: "Qualified", color: "border-t-indigo-500 bg-indigo-500/5 text-indigo-500" },
  { id: "proposal", name: "Proposal Sent", color: "border-t-orange-500 bg-orange-500/5 text-orange-500" },
  { id: "won", name: "Closed Won", color: "border-t-success-500 bg-success-500/5 text-success-600" },
  { id: "lost", name: "Closed Lost", color: "border-t-neutral-400 bg-neutral-500/5 text-neutral-500" }
];

export default function DealsPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  // New Deal Form State
  const [form, setForm] = useState({
    name: "",
    amount: "",
    stage: "prospecting",
    leadId: ""
  });

  // Fetch Deals
  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["deals"],
    queryFn: async () => {
      const res = await fetch("/api/deals");
      if (!res.ok) throw new Error("Failed to fetch deals");
      return res.json();
    }
  });

  // Fetch Leads for dropdown selection
  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ["leads-deals-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/leads");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Create Deal Mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create deal");
      return res.json();
    },
    onSuccess: () => {
      setShowAddModal(false);
      setForm({ name: "", amount: "", stage: "prospecting", leadId: "" });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      alert("New sales opportunity deal created!");
    }
  });

  // Update Deal Stage Mutation
  const updateStageMutation = useMutation({
    mutationFn: async ({ dealId, stage }: { dealId: string; stage: string }) => {
      const res = await fetch("/api/deals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, stage })
      });
      if (!res.ok) throw new Error("Failed to update deal stage");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  // Delete Deal Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/deals?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete deal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    }
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.leadId || !form.amount) return;
    createMutation.mutate(form);
  };

  const getStageDeals = (stageId: string) => {
    return deals.filter(d => d.stage === stageId);
  };

  const getStageTotal = (stageId: string) => {
    return deals.filter(d => d.stage === stageId).reduce((sum, d) => sum + d.amount, 0);
  };

  // Pipeline total stats
  const totalPipelineValue = deals.reduce((sum, d) => sum + d.amount, 0);
  const wonPipelineValue = deals.filter(d => d.stage === "won").reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Pipeline & Deals Kanban</h1>
          <p className="text-xs text-text-secondary">Track contract sizes, sales qualification stages, and total expected monthly recurring revenue.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Sales Deal
          </button>
        </div>
      </div>

      {/* Top metrics summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <DollarSign className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase">Total Pipeline Value</span>
          </div>
          <p className="text-xl font-bold text-text-primary">${totalPipelineValue.toLocaleString()}</p>
        </div>

        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <Award className="w-4 h-4 text-success-500" />
            <span className="text-[10px] font-bold uppercase">Closed Won Revenue</span>
          </div>
          <p className="text-xl font-bold text-text-primary">${wonPipelineValue.toLocaleString()}</p>
        </div>

        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <TrendingUp className="w-4 h-4 text-accent-500" />
            <span className="text-[10px] font-bold uppercase">Deals Won Ratio</span>
          </div>
          <p className="text-xl font-bold text-text-primary">
            {deals.length > 0 ? Math.round((deals.filter(d => d.stage === "won").length / deals.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4 h-[calc(100vh-270px)] scrollbar-thin">
        {pipelineStages.map((stage) => {
          const stageDeals = getStageDeals(stage.id);
          const stageTotal = getStageTotal(stage.id);

          return (
            <div key={stage.id} className="bg-surface border border-border rounded-xl flex flex-col h-full min-w-[220px]">
              {/* Stage Header */}
              <div className={cn("p-3 border-t-2 border-b border-border rounded-t-xl flex flex-col gap-0.5", stage.color)}>
                <div className="flex justify-between items-center font-bold text-xs">
                  <span>{stage.name}</span>
                  <span className="px-1.5 py-0.5 bg-surface border border-border rounded-full text-[9px] font-bold">
                    {stageDeals.length}
                  </span>
                </div>
                <span className="text-[10px] font-bold opacity-80">${stageTotal.toLocaleString()}</span>
              </div>

              {/* Cards wrapper */}
              <div className="flex-1 p-2 overflow-y-auto space-y-2 scrollbar-thin">
                {isLoading ? (
                  <div className="h-20 bg-surface-tertiary rounded-lg animate-pulse" />
                ) : stageDeals.length === 0 ? (
                  <div className="text-center py-8 text-[10px] text-text-tertiary italic">No active opportunities</div>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="border border-border/80 p-3 bg-surface hover:border-accent-500/30 transition-all rounded-xl shadow-sm space-y-2 group"
                    >
                      <div>
                        <span className="font-bold text-xs text-text-primary leading-tight block">{deal.name}</span>
                        <span className="text-[10px] text-accent-500 font-bold block mt-1">${deal.amount.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-border/40 pt-2 text-[10px] text-text-secondary space-y-0.5">
                        <div className="truncate font-semibold text-text-primary">Lead: {deal.lead.contactName}</div>
                        <div className="truncate text-text-tertiary font-medium">{deal.lead.companyName}</div>
                      </div>

                      {/* Card movements controls */}
                      <div className="flex items-center justify-between border-t border-border/40 pt-2 mt-1">
                        <div className="flex gap-1.5">
                          {stage.id !== "prospecting" && (
                            <button
                              onClick={() => {
                                const idx = pipelineStages.findIndex(s => s.id === stage.id);
                                updateStageMutation.mutate({ dealId: deal.id, stage: pipelineStages[idx - 1].id });
                              }}
                              className="p-1 hover:bg-surface-secondary text-text-tertiary hover:text-text-primary border border-border/60 rounded"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                          )}
                          {stage.id !== "lost" && (
                            <button
                              onClick={() => {
                                const idx = pipelineStages.findIndex(s => s.id === stage.id);
                                updateStageMutation.mutate({ dealId: deal.id, stage: pipelineStages[idx + 1].id });
                              }}
                              className="p-1 hover:bg-surface-secondary text-text-tertiary hover:text-text-primary border border-border/60 rounded"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (confirm("Delete this opportunity deal?")) {
                              deleteMutation.mutate(deal.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-danger-500/10 text-text-tertiary hover:text-danger-600 rounded transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE DEAL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-surface border border-border p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="text-sm font-bold text-text-primary">Create Deal Opportunity</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-text-tertiary hover:text-text-primary rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary">Opportunity Name*</label>
                <input
                  type="text"
                  placeholder="e.g. Supabase Startup Package Deal"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-2 border border-border rounded-lg text-text-primary focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary">Linked Contact Lead*</label>
                <select
                  value={form.leadId}
                  onChange={(e) => setForm(prev => ({ ...prev, leadId: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-2 border border-border rounded-lg text-text-primary focus:outline-none"
                  required
                >
                  <option value="">-- Choose Target Lead --</option>
                  {leads.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.contactName} ({l.companyName})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary">Contract Value Amount ($)*</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-2 border border-border rounded-lg text-text-primary focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary">Deal Stage</label>
                <select
                  value={form.stage}
                  onChange={(e) => setForm(prev => ({ ...prev, stage: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-2 border border-border rounded-lg text-text-primary focus:outline-none"
                >
                  <option value="prospecting">Prospecting</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal Sent</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-border hover:bg-surface-secondary text-text-secondary font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!form.name || !form.leadId || !form.amount || createMutation.isPending}
                  className="px-4 py-2 bg-accent-500 hover:bg-accent-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
                >
                  {createMutation.isPending ? "Creating..." : "Confirm Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
