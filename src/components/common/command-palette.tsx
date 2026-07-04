"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Layers,
  FileText,
  GitBranch,
  Inbox,
  BarChart3,
  BookOpen,
  Settings,
  Sparkles,
  Command
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "AI Search Workspace", href: "/search", icon: Sparkles },
  { label: "Outbound Sessions", href: "/sessions", icon: Layers },
  { label: "Email Templates", href: "/templates", icon: FileText },
  { label: "Outreach Pipeline Board", href: "/pipeline", icon: GitBranch },
  { label: "Inbox Thread Replies", href: "/inbox", icon: Inbox },
  { label: "Campaign Analytics Reports", href: "/analytics", icon: BarChart3 },
  { label: "Personal Knowledge Base", href: "/knowledge", icon: BookOpen },
  { label: "Workspace Settings", href: "/settings", icon: Settings },
];

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNavigate = (href: string) => {
    router.push(href);
    setIsOpen(false);
    setSearch("");
  };

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Keyboard Hint on Layout */}
      <div className="fixed bottom-4 right-4 z-40 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface shadow-md select-none text-[10px] text-text-secondary font-medium">
        <Command className="w-3 h-3 text-text-tertiary" />
        <span>Press</span>
        <kbd className="bg-surface-tertiary px-1 py-0.5 rounded border border-border">⌘</kbd>
        <kbd className="bg-surface-tertiary px-1 py-0.5 rounded border border-border">K</kbd>
        <span>to navigate</span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[15vh] px-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search bar */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                <Search className="w-4 h-4 text-text-tertiary shrink-0" />
                <input
                  type="text"
                  placeholder="Search commands, pages, and workspaces..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Items List */}
              <div className="max-h-[300px] overflow-y-auto p-2">
                {filteredItems.map((item, idx) => (
                  <button
                    key={item.href}
                    onClick={() => handleNavigate(item.href)}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left",
                      "text-text-secondary hover:text-text-primary hover:bg-surface-hover hover:border-l-4 hover:border-accent-500"
                    )}
                  >
                    <item.icon className="w-4 h-4 text-text-tertiary shrink-0" />
                    <span>{item.label}</span>
                  </button>
                ))}

                {filteredItems.length === 0 && (
                  <div className="text-center py-8 text-xs text-text-tertiary">
                    No results matching &ldquo;{search}&rdquo;
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
