"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  Phone,
  Linkedin,
  Mail,
  AlertCircle,
  Clock,
  CheckCircle,
  X,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DialerModal } from "@/components/common/dialer-modal";
import { StatusBadge } from "@/components/common/status-badge";

type TaskStatus = "pending" | "completed" | "skipped";

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState<TaskStatus>("pending");
  const [dialerLead, setDialerLead] = useState<any | null>(null);

  // Fetch Tasks matching activeStatus
  const { data: tasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["tasks", activeStatus],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?status=${activeStatus}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    }
  });

  // Task Completion Mutation
  const completeMutation = useMutation({
    mutationFn: async ({ taskId, action }: { taskId: string; action: "complete" | "skip" }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, action })
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      alert("Task updated successfully!");
    }
  });

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="w-4 h-4 text-orange-500 animate-pulse" />;
      case "linkedin_connect":
      case "linkedin":
        return <Linkedin className="w-4 h-4 text-blue-500" />;
      case "email_manual":
      case "email":
        return <Mail className="w-4 h-4 text-accent-500" />;
      default:
        return <CheckSquare className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-3 shrink-0">
        <h1 className="text-lg font-bold text-text-primary">Outbound Action Checklist</h1>
        <p className="text-xs text-text-secondary">Execute manual outreach steps (phone dials, LinkedIn connection requests) scheduled by your sequences.</p>
      </div>

      {/* Task status sub-tabs */}
      <div className="flex items-center gap-1.5 border-b border-border bg-surface p-1 rounded-xl shadow-sm h-11 shrink-0">
        <button
          onClick={() => setActiveStatus("pending")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
            activeStatus === "pending" ? "bg-accent-500 text-white shadow-sm" : "text-text-secondary hover:bg-surface-secondary"
          )}
        >
          Pending Tasks ({activeStatus === "pending" ? tasks.length : "..."})
        </button>
        <button
          onClick={() => setActiveStatus("completed")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
            activeStatus === "completed" ? "bg-accent-500 text-white shadow-sm" : "text-text-secondary hover:bg-surface-secondary"
          )}
        >
          Completed ({activeStatus === "completed" ? tasks.length : "..."})
        </button>
        <button
          onClick={() => setActiveStatus("skipped")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
            activeStatus === "skipped" ? "bg-accent-500 text-white shadow-sm" : "text-text-secondary hover:bg-surface-secondary"
          )}
        >
          Skipped ({activeStatus === "skipped" ? tasks.length : "..."})
        </button>
      </div>

      {/* Checklist Grid */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-surface-tertiary rounded-xl animate-pulse" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 bg-surface border border-border rounded-xl">
            <UserCheck className="w-12 h-12 text-text-tertiary/20 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-text-primary">All caught up!</h3>
            <p className="text-xs text-text-tertiary max-w-sm mx-auto mt-1.5">No tasks match this filter. Enrolled sequence leads will automatically trigger tasks as follow-up schedules require.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between gap-4 p-4 bg-surface border border-border rounded-xl shadow-sm hover:border-border transition-all"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
                  {getTaskIcon(task.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-text-primary truncate">{task.title}</span>
                    <span className="text-[9px] text-text-tertiary uppercase font-bold">
                      {task.type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-0.5 truncate">
                    Lead: <span className="font-bold text-text-primary">{task.lead.contactName}</span> ({task.lead.companyName}) · <span className="text-accent-500 font-semibold">{task.lead.location}</span>
                  </p>
                  <p className="text-[10px] text-text-tertiary italic mt-1 bg-surface-secondary/50 border border-border/40 p-2 rounded-lg">
                    Instructions: {task.description || "Establish contact and verify details."}
                  </p>
                </div>
              </div>

              {/* Actions Panel */}
              <div className="flex items-center gap-2 shrink-0">
                {activeStatus === "pending" && (
                  <>
                    {task.type === "call" ? (
                      <button
                        onClick={() => setDialerLead(task.lead)}
                        className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                      >
                        <Phone className="w-3.5 h-3.5 fill-white" />
                        Dial Call
                      </button>
                    ) : task.type === "linkedin_connect" && task.lead.contactLinkedin ? (
                      <a
                        href={task.lead.contactLinkedin}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => completeMutation.mutate({ taskId: task.id, action: "complete" })}
                        className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                      >
                        <Linkedin className="w-3.5 h-3.5 fill-white border-none" />
                        Connect
                      </a>
                    ) : (
                      <button
                        onClick={() => completeMutation.mutate({ taskId: task.id, action: "complete" })}
                        className="px-3 py-1.5 bg-accent-500 hover:bg-accent-600 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors"
                      >
                        Complete
                      </button>
                    )}
                    <button
                      onClick={() => completeMutation.mutate({ taskId: task.id, action: "skip" })}
                      className="px-3 py-1.5 border border-border hover:bg-surface-secondary text-text-secondary font-semibold rounded-lg text-xs cursor-pointer"
                    >
                      Skip
                    </button>
                  </>
                )}
                {activeStatus === "completed" && (
                  <span className="text-[10px] text-success-600 bg-success-500/10 font-bold px-2.5 py-1 rounded-full uppercase">
                    Done
                  </span>
                )}
                {activeStatus === "skipped" && (
                  <span className="text-[10px] text-text-tertiary bg-surface-secondary border border-border font-bold px-2.5 py-1 rounded-full uppercase">
                    Skipped
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* PHONE DIALER MODAL INJECTOR */}
      {dialerLead && (
        <DialerModal
          lead={dialerLead}
          onClose={() => setDialerLead(null)}
          onSuccess={() => {
            setDialerLead(null);
            queryClient.invalidateQueries({ queryKey: ["tasks", activeStatus] });
          }}
        />
      )}
    </div>
  );
}
