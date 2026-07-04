"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  useKnowledge,
  useCreateKnowledgeEntry,
  useDeleteKnowledgeEntry,
} from "@/hooks/use-knowledge";
import { PageHeader } from "@/components/common/page-header";
import {
  BookOpen,
  Plus,
  Trash2,
  User,
  Code,
  Briefcase,
  Link as LinkIcon,
  DollarSign,
  Calendar,
  FileText,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { value: "personal", label: "Personal Info", icon: User },
  { value: "skills", label: "Skills", icon: Code },
  { value: "experience", label: "Experience", icon: Briefcase },
  { value: "links", label: "Links & Profiles", icon: LinkIcon },
  { value: "pricing", label: "Pricing", icon: DollarSign },
  { value: "availability", label: "Availability", icon: Calendar },
  { value: "notes", label: "Notes", icon: FileText },
];

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const inputClasses = cn(
  "w-full px-3 py-2 rounded-lg text-sm border transition-all duration-150",
  "bg-surface border-border text-text-primary placeholder:text-text-tertiary",
  "focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
);

export default function KnowledgePage() {
  const { data, isLoading } = useKnowledge();
  const createEntry = useCreateKnowledgeEntry();
  const deleteEntry = useDeleteKnowledgeEntry();
  const [activeCategory, setActiveCategory] = useState("personal");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");

  const entries = data?.entries || [];
  const filteredEntries = entries.filter((e) => e.category === activeCategory);

  const handleAdd = async () => {
    if (!newLabel.trim() || !newValue.trim()) return;
    await createEntry.mutateAsync({
      category: activeCategory,
      label: newLabel.trim(),
      value: newValue.trim(),
      sortOrder: filteredEntries.length,
    });
    setNewLabel("");
    setNewValue("");
    setShowAddForm(false);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
    >
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Knowledge Base"
          description="Your personal information used for AI email personalization"
        />
      </motion.div>

      <div className="flex gap-6">
        {/* Category Sidebar */}
        <motion.div variants={fadeUp} className="w-48 shrink-0">
          <nav className="space-y-0.5">
            {categories.map((cat) => {
              const count = entries.filter((e) => e.category === cat.value).length;
              return (
                <button
                  key={cat.value}
                  onClick={() => {
                    setActiveCategory(cat.value);
                    setShowAddForm(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    activeCategory === cat.value
                      ? "bg-accent-500/10 text-accent-500"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  )}
                >
                  <cat.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{cat.label}</span>
                  {count > 0 && (
                    <span className="text-xs text-text-tertiary">{count}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </motion.div>

        {/* Content Area */}
        <motion.div variants={fadeUp} className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">
              {categories.find((c) => c.value === activeCategory)?.label}
            </h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                "text-accent-500 hover:bg-accent-500/10"
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Entry
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="mb-4 p-4 rounded-xl border border-accent-500/20 bg-accent-50/50 dark:bg-accent-900/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-primary">New Entry</span>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-0.5 rounded hover:bg-surface-hover text-text-tertiary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label (e.g., Full Name, GitHub URL)"
                  className={inputClasses}
                  autoFocus
                />
                <textarea
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Value..."
                  rows={2}
                  className={cn(inputClasses, "resize-none")}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAdd}
                    disabled={!newLabel.trim() || !newValue.trim() || createEntry.isPending}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      "bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50"
                    )}
                  >
                    {createEntry.isPending ? "Adding..." : "Add"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Entries List */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-surface-tertiary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredEntries.length > 0 ? (
            <div className="space-y-1">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl hover:bg-surface-hover transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-0.5">
                      {entry.label}
                    </p>
                    <p className="text-sm text-text-primary whitespace-pre-wrap break-words">
                      {entry.value}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Delete this entry?")) {
                        deleteEntry.mutate(entry.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger-50 hover:text-danger-500 dark:hover:bg-danger-500/10 text-text-tertiary transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="w-8 h-8 text-text-tertiary mb-3" />
              <p className="text-sm text-text-secondary mb-1">
                No entries in {categories.find((c) => c.value === activeCategory)?.label}
              </p>
              <p className="text-xs text-text-tertiary">
                Add information that AI will use to personalize your emails
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
