"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import {
  TrendingUp,
  Users,
  Mail,
  MessageSquare,
  AlertOctagon,
  Award,
  ChevronRight,
  Sparkles,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface AnalyticsData {
  global: {
    totalLeads: number;
    qualifiedCount: number;
    rejectedCount: number;
    qualifiedRate: string;
    totalSent: number;
    totalReplies: number;
    replyRate: string;
    positiveReplies: number;
    rejectionsReplies: number;
    positiveResponseRate: string;
    bounceRate: string;
  };
  templates: Array<{
    id: string;
    name: string;
    category: string;
    tone: string;
    sent: number;
    replies: number;
    replyRate: string;
  }>;
}

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-32 bg-surface-tertiary rounded mb-2" />
        <div className="h-4 w-64 bg-surface-tertiary rounded mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-surface-tertiary rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-surface-tertiary rounded-xl" />
          <div className="h-64 bg-surface-tertiary rounded-xl" />
        </div>
      </div>
    );
  }

  const global = data?.global;
  const templates = data?.templates || [];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-6"
    >
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Outreach Analytics"
          description="Performance insights, lead conversion funnels, and templates effectiveness"
        />
      </motion.div>

      {/* Global Metrics Grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Total Leads Discovered"
          value={global?.totalLeads || 0}
          subtext={`Qualified: ${global?.qualifiedCount || 0} (${global?.qualifiedRate || 0}%)`}
        />
        <MetricCard
          icon={Mail}
          label="Emails Dispatched"
          value={global?.totalSent || 0}
          subtext={`Bounce Rate: ${global?.bounceRate || 0}%`}
        />
        <MetricCard
          icon={MessageSquare}
          label="Replies Received"
          value={global?.totalReplies || 0}
          subtext={`Reply Rate: ${global?.replyRate || 0}%`}
        />
        <MetricCard
          icon={Award}
          label="Positive Responses"
          value={global?.positiveReplies || 0}
          subtext={`Conversion Rate: ${global?.positiveResponseRate || 0}%`}
        />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Funnel */}
        <motion.div variants={fadeUp} className="p-5 rounded-xl border border-border bg-surface">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Outbound Conversion Funnel</h3>
          <div className="space-y-4">
            <ProgressBar label="Leads Discovered" value={global?.totalLeads || 0} max={global?.totalLeads || 1} color="bg-neutral-500" />
            <ProgressBar label="Qualified Opportunities" value={global?.qualifiedCount || 0} max={global?.totalLeads || 1} color="bg-accent-400" />
            <ProgressBar label="Emails Sent" value={global?.totalSent || 0} max={global?.qualifiedCount || 1} color="bg-accent-500" />
            <ProgressBar label="Conversations Started" value={global?.totalReplies || 0} max={global?.totalSent || 1} color="bg-success-500" />
          </div>
        </motion.div>

        {/* Sentiment Classification */}
        <motion.div variants={fadeUp} className="p-5 rounded-xl border border-border bg-surface flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Reply Sentiment Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 font-medium text-text-secondary">
                  <span className="w-2.5 h-2.5 rounded-full bg-success-500" />
                  Positive / Booking Interest
                </span>
                <span className="font-semibold text-text-primary">{global?.positiveReplies || 0} replies</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 font-medium text-text-secondary">
                  <span className="w-2.5 h-2.5 rounded-full bg-danger-500" />
                  Rejections & Out of Office
                </span>
                <span className="font-semibold text-text-primary">{global?.rejectionsReplies || 0} replies</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 font-medium text-text-secondary">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
                  General Inquiries
                </span>
                <span className="font-semibold text-text-primary">
                  {(global?.totalReplies || 0) - (global?.positiveReplies || 0) - (global?.rejectionsReplies || 0)} replies
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-border border-dashed pt-4 mt-6 flex justify-between items-center text-xs text-text-secondary">
            <span>Overall Interest Conversion Rate</span>
            <span className="font-bold text-success-600 dark:text-success-500">{global?.positiveResponseRate || 0}%</span>
          </div>
        </motion.div>
      </div>

      {/* Template Performance */}
      <motion.div variants={fadeUp} className="p-5 rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Template Strategy Performance</h3>
          <Link
            href="/templates"
            className="text-xs text-accent-500 hover:underline flex items-center gap-0.5"
          >
            Manage Templates <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {templates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-text-tertiary">
                  <th className="py-2.5 font-semibold">Template Strategy</th>
                  <th className="py-2.5 font-semibold">Tone</th>
                  <th className="py-2.5 font-semibold">Emails Sent</th>
                  <th className="py-2.5 font-semibold">Replies</th>
                  <th className="py-2.5 font-semibold text-right">Reply Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text-primary">
                {templates.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="py-3">
                      <div className="font-semibold">{tpl.name}</div>
                      <div className="text-[10px] text-text-tertiary mt-0.5 uppercase tracking-wider">{tpl.category}</div>
                    </td>
                    <td className="py-3 capitalize">{tpl.tone}</td>
                    <td className="py-3 font-medium">{tpl.sent}</td>
                    <td className="py-3 font-medium">{tpl.replies}</td>
                    <td className="py-3 font-bold text-right text-accent-500">
                      {tpl.replyRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-xs text-text-tertiary">
            No templates available. Seed templates in Settings to view statistics.
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  subtext: string;
}) {
  return (
    <div className="px-4 py-3.5 rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-text-tertiary" />
        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight text-text-primary">{value}</p>
      <p className="text-[10px] text-text-tertiary mt-1.5 font-medium">{subtext}</p>
    </div>
  );
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const percent = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between font-medium">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary">{value} ({percent}%)</span>
      </div>
      <div className="w-full bg-surface-tertiary h-2 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-300", color)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
