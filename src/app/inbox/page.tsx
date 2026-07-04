"use client";

import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Inbox as InboxIcon } from "lucide-react";

export default function InboxPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title="Inbox"
        description="Manage replies and conversations"
      />

      <EmptyState
        icon={InboxIcon}
        title="No messages yet"
        description="Replies from your outreach will appear here. Connect Gmail in Settings to enable reply tracking. Full inbox will be available in Phase 4."
      />
    </motion.div>
  );
}
