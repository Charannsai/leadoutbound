"use client";

import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/page-header";
import { BarChart3 } from "lucide-react";

const metrics = [
  { label: "Total Leads Generated", value: "0" },
  { label: "Emails Approved", value: "0" },
  { label: "Emails Sent", value: "0" },
  { label: "Reply Rate", value: "0%" },
  { label: "Positive Response Rate", value: "0%" },
  { label: "Bounce Rate", value: "0%" },
  { label: "Follow-up Performance", value: "—" },
  { label: "Conversions", value: "0" },
];

export default function AnalyticsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title="Analytics"
        description="Measure outreach effectiveness across all sessions"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="px-4 py-3.5 rounded-xl border border-border bg-surface"
          >
            <p className="text-xs text-text-secondary font-medium mb-1">
              {metric.label}
            </p>
            <p className="text-xl font-semibold tracking-tight text-text-primary">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-xl">
        <BarChart3 className="w-10 h-10 text-text-tertiary mb-3" />
        <p className="text-sm font-medium text-text-primary mb-1">
          Analytics Coming in Phase 4
        </p>
        <p className="text-xs text-text-secondary max-w-sm text-center">
          Detailed charts and breakdowns by session, template, and time period
          will be available once outreach data is collected.
        </p>
      </div>
    </motion.div>
  );
}
