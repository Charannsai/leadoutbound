"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  User,
  Plus,
  Trash2,
  CheckCircle,
  X,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Users,
  Video
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/common/status-badge";

type MeetingStatus = "scheduled" | "completed" | "cancelled";

export default function MeetingsPage() {
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState<MeetingStatus>("scheduled");
  const [showAddModal, setShowAddModal] = useState(false);

  // New meeting form state
  const [form, setForm] = useState({
    title: "",
    startTime: "",
    endTime: "",
    leadId: ""
  });

  // Fetch Meetings
  const { data: meetings = [], isLoading } = useQuery<any[]>({
    queryKey: ["meetings", activeStatus],
    queryFn: async () => {
      const res = await fetch(`/api/meetings?status=${activeStatus}`);
      if (!res.ok) throw new Error("Failed to fetch meetings");
      return res.json();
    }
  });

  // Fetch Leads for dropdown selection
  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ["leads-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/leads?limit=all");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Create Meeting Mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Create meeting failed");
      return res.json();
    },
    onSuccess: () => {
      setShowAddModal(false);
      setForm({ title: "", startTime: "", endTime: "", leadId: "" });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      alert("Calendar meeting booked successfully!");
    }
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ meetingId, status }: { meetingId: string; status: MeetingStatus }) => {
      const res = await fetch("/api/meetings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, status })
      });
      if (!res.ok) throw new Error("Update status failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  // Delete Meeting Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/meetings?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete meeting failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    }
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.startTime || !form.endTime || !form.leadId) return;
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Booked Meetings</h1>
          <p className="text-xs text-text-secondary">Manage scheduled sales demos, intro calls, and calendars synced with target leads.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Book Call Event
          </button>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex items-center gap-1.5 border-b border-border bg-surface p-1 rounded-xl shadow-sm h-11 shrink-0">
        <button
          onClick={() => setActiveStatus("scheduled")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
            activeStatus === "scheduled" ? "bg-accent-500 text-white shadow-sm" : "text-text-secondary hover:bg-surface-secondary"
          )}
        >
          Upcoming Meetings ({activeStatus === "scheduled" ? meetings.length : "..."})
        </button>
        <button
          onClick={() => setActiveStatus("completed")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
            activeStatus === "completed" ? "bg-accent-500 text-white shadow-sm" : "text-text-secondary hover:bg-surface-secondary"
          )}
        >
          Completed ({activeStatus === "completed" ? meetings.length : "..."})
        </button>
        <button
          onClick={() => setActiveStatus("cancelled")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
            activeStatus === "cancelled" ? "bg-accent-500 text-white shadow-sm" : "text-text-secondary hover:bg-surface-secondary"
          )}
        >
          Cancelled ({activeStatus === "cancelled" ? meetings.length : "..."})
        </button>
      </div>

      {/* List content */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-surface-tertiary rounded-xl animate-pulse" />
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-20 bg-surface border border-border rounded-xl">
            <Calendar className="w-12 h-12 text-text-tertiary/20 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-text-primary">No meetings scheduled</h3>
            <p className="text-xs text-text-tertiary max-w-sm mx-auto mt-1.5">Scheduled meetings will display here. Dial calls or send email templates to book sales conversations.</p>
          </div>
        ) : (
          meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="flex items-center justify-between gap-4 p-4 bg-surface border border-border rounded-xl shadow-sm hover:border-border transition-all"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <Video className="w-4 h-4 text-accent-500" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-text-primary block">{meeting.title}</span>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-text-secondary">
                    <User className="w-3.5 h-3.5" />
                    <span>Lead: <strong>{meeting.lead.contactName}</strong> ({meeting.lead.companyName})</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-text-tertiary">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(meeting.startTime).toLocaleString()} - {new Date(meeting.endTime).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions panel */}
              <div className="flex items-center gap-2 shrink-0">
                {activeStatus === "scheduled" && (
                  <>
                    <button
                      onClick={() => updateStatusMutation.mutate({ meetingId: meeting.id, status: "completed" })}
                      className="px-3 py-1.5 bg-success-500 hover:bg-success-600 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors shadow-sm"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => updateStatusMutation.mutate({ meetingId: meeting.id, status: "cancelled" })}
                      className="px-3 py-1.5 border border-border hover:bg-surface-secondary text-text-secondary font-semibold rounded-lg text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {activeStatus === "completed" && (
                  <span className="text-[10px] text-success-600 bg-success-500/10 font-bold px-2.5 py-1 rounded-full uppercase">
                    Conducted
                  </span>
                )}
                {activeStatus === "cancelled" && (
                  <span className="text-[10px] text-text-tertiary bg-surface-secondary border border-border font-bold px-2.5 py-1 rounded-full uppercase">
                    No-Show
                  </span>
                )}
                <button
                  onClick={() => {
                    if (confirm("Delete this meeting log?")) {
                      deleteMutation.mutate(meeting.id);
                    }
                  }}
                  className="p-1.5 hover:bg-danger-500/10 text-text-tertiary hover:text-danger-600 border border-border hover:border-danger-500/20 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* BOOK CALL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-surface border border-border p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="text-sm font-bold text-text-primary">Book Calendar Call</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-text-tertiary hover:text-text-primary rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary">Meeting Title*</label>
                <input
                  type="text"
                  placeholder="e.g. Supabase Product Demo Call"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-2 border border-border rounded-lg text-text-primary focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary">Target Contact*</label>
                <select
                  value={form.leadId}
                  onChange={(e) => setForm(prev => ({ ...prev, leadId: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-2 border border-border rounded-lg text-text-primary focus:outline-none"
                  required
                >
                  <option value="">-- Select Contact --</option>
                  {leads.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.contactName} ({l.companyName})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary">Start Time*</label>
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-2 border border-border rounded-lg text-text-primary focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary">End Time*</label>
                <input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => setForm(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full bg-surface-secondary px-3 py-2 border border-border rounded-lg text-text-primary focus:outline-none"
                  required
                />
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
                  disabled={!form.title || !form.startTime || !form.endTime || !form.leadId || createMutation.isPending}
                  className="px-4 py-2 bg-accent-500 hover:bg-accent-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
                >
                  {createMutation.isPending ? "Booking..." : "Confirm Book Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
