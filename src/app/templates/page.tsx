"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTemplates, useDeleteTemplate } from "@/hooks/use-templates";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import Link from "next/link";
import {
  Plus,
  FileText,
  Trash2,
  Copy,
  MoreHorizontal,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const categoryLabels: Record<string, string> = {
  job_application: "Job Application",
  startup_founder: "Startup Founder",
  recruiter: "Recruiter",
  freelance: "Freelance",
  agency: "Agency",
  saas_sales: "SaaS Sales",
  partnerships: "Partnerships",
  investor: "Investor",
  referral: "Referral",
  general_bd: "General BD",
};

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Reusable outreach strategies for different scenarios"
        action={
          <Link
            href="/templates/new"
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
              "bg-accent-500 text-white hover:bg-accent-600"
            )}
          >
            <Plus className="w-4 h-4" />
            New Template
          </Link>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-[120px] bg-surface-tertiary rounded-xl animate-pulse" />
          ))}
        </div>
      ) : templates && templates.length > 0 ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {templates.map((template) => (
            <motion.div key={template.id} variants={fadeUp}>
              <Link
                href={`/templates/${template.id}`}
                className={cn(
                  "block p-4 rounded-xl border transition-all duration-150 group relative",
                  "border-border bg-surface hover:bg-surface-hover hover:border-accent-500/20"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-text-tertiary shrink-0" />
                      <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent-500 transition-colors">
                        {template.name}
                      </p>
                      {template.isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-500/10 text-accent-500 font-medium">
                          Default
                        </span>
                      )}
                    </div>
                    <StatusBadge status={template.category} className="mb-2" />
                    {template.description && (
                      <p className="text-xs text-text-tertiary line-clamp-2 mt-1.5">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-text-tertiary">
                        Tone: {template.tone}
                      </span>
                      {template.followUpEnabled && (
                        <span className="text-xs text-text-tertiary">
                          {template.followUpCount} follow-ups
                        </span>
                      )}
                      {template._count && (
                        <span className="text-xs text-text-tertiary flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {template._count.sessions} sessions
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveMenu(activeMenu === template.id ? null : template.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-tertiary text-text-tertiary transition-all"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {activeMenu === template.id && (
                      <div
                        className="absolute right-0 top-8 z-10 w-36 bg-surface border border-border rounded-lg shadow-lg py-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveMenu(null);
                            // Duplicate logic handled in Phase 2
                          }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Duplicate
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveMenu(null);
                            if (confirm("Delete this template?")) {
                              deleteTemplate.mutate(template.id);
                            }
                          }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Templates will be seeded automatically when the database is initialized."
        />
      )}
    </div>
  );
}
