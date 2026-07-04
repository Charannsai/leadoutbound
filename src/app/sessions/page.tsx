"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSessions, useCreateSession, useDeleteSession } from "@/hooks/use-sessions";
import { PageHeader } from "@/components/common/page-header";
import { Modal } from "@/components/common/modal";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import Link from "next/link";
import {
  Plus,
  Search,
  Layers,
  Clock,
  Trash2,
  X,
  Users,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function SessionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  const { data: sessions, isLoading } = useSessions(search, statusFilter);
  const deleteSession = useDeleteSession();

  const statuses = [
    "all",
    "draft",
    "searching",
    "qualifying",
    "personalizing",
    "reviewing",
    "sending",
    "completed",
    "paused",
  ];

  return (
    <div>
      <PageHeader
        title="Sessions"
        description="Manage your outreach sessions and track progress"
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
              "bg-accent-500 text-white hover:bg-accent-600"
            )}
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full pl-9 pr-3 py-2 rounded-lg text-sm border transition-all duration-150",
              "bg-surface border-border text-text-primary placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
            )}
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s === "all" ? "" : s)}
              className={cn(
                "px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap",
                (s === "all" && !statusFilter) || statusFilter === s
                  ? "bg-accent-500/10 text-accent-500"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-[72px] bg-surface-tertiary rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : sessions && sessions.length > 0 ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
          className="space-y-1"
        >
          {sessions.map((session) => (
            <motion.div key={session.id} variants={fadeUp}>
              <Link
                href={`/sessions/${session.id}`}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl border border-transparent transition-all duration-150",
                  "hover:bg-surface-hover hover:border-border group"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary group-hover:text-accent-500 transition-colors truncate">
                      {session.name}
                    </p>
                    <StatusBadge status={session.status} />
                  </div>
                  <p className="text-xs text-text-tertiary truncate mt-0.5">
                    {session.searchQuery}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-text-tertiary">
                    <Users className="w-3.5 h-3.5" />
                    {session._count.leads}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-text-tertiary">
                    <Mail className="w-3.5 h-3.5" />
                    {session.emailsSent}
                  </div>
                  <span className="text-xs text-text-tertiary flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(session.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteSessionId(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger-50 hover:text-danger-500 dark:hover:bg-danger-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <EmptyState
          icon={Layers}
          title="No sessions yet"
          description="Create your first outreach session to start discovering leads and sending personalized emails."
          action={
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-accent-500 text-white hover:bg-accent-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Session
            </button>
          }
        />
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateSessionModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>

      <Modal
        isOpen={deleteSessionId !== null}
        onClose={() => setDeleteSessionId(null)}
        onConfirm={() => {
          if (deleteSessionId) {
            deleteSession.mutate(deleteSessionId);
          }
        }}
        title="Delete Session"
        description="Are you sure you want to delete this outreach session? This will remove all associated lead qualification records."
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  );
}

function CreateSessionModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [description, setDescription] = useState("");
  const createSession = useCreateSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !searchQuery.trim()) return;

    await createSession.mutateAsync({ name, searchQuery, description });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-text-primary">
            New Session
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-hover text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Session Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Early-stage AI startup outreach"
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm border transition-all duration-150",
                "bg-surface border-border text-text-primary placeholder:text-text-tertiary",
                "focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
              )}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Search Query
            </label>
            <textarea
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Describe what you're looking for..."
              rows={3}
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm border transition-all duration-150 resize-none",
                "bg-surface border-border text-text-primary placeholder:text-text-tertiary",
                "focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
              )}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Description{" "}
              <span className="text-text-tertiary font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief notes about this session"
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm border transition-all duration-150",
                "bg-surface border-border text-text-primary placeholder:text-text-tertiary",
                "focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
              )}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !searchQuery.trim() || createSession.isPending}
              className={cn(
                "px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                "bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {createSession.isPending ? "Creating..." : "Create Session"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
