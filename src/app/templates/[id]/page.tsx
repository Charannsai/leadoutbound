"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { useTemplate, useUpdateTemplate, useCreateTemplate } from "@/hooks/use-templates";
import { PageHeader } from "@/components/common/page-header";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { value: "job_application", label: "Job Application" },
  { value: "startup_founder", label: "Startup Founder" },
  { value: "recruiter", label: "Recruiter" },
  { value: "freelance", label: "Freelance" },
  { value: "agency", label: "Agency" },
  { value: "saas_sales", label: "SaaS Sales" },
  { value: "partnerships", label: "Partnerships" },
  { value: "investor", label: "Investor" },
  { value: "referral", label: "Referral" },
  { value: "general_bd", label: "General BD" },
];

const tones = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "formal", label: "Formal" },
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

const labelClasses = "block text-xs font-medium text-text-secondary mb-1.5";

export default function TemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();

  const { data: template, isLoading } = useTemplate(isNew ? "" : id);
  const updateTemplate = useUpdateTemplate();
  const createTemplate = useCreateTemplate();

  const [form, setForm] = useState({
    name: "",
    category: "job_application",
    description: "",
    subjectRules: "",
    bodyInstructions: "",
    tone: "professional",
    followUpEnabled: true,
    followUpCount: 2,
    followUpDelayDays: 3,
    followUpInstructions: "",
    attachResume: false,
    attachPortfolio: false,
    aiPromptOverride: "",
  });

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name,
        category: template.category,
        description: template.description || "",
        subjectRules: template.subjectRules || "",
        bodyInstructions: template.bodyInstructions || "",
        tone: template.tone,
        followUpEnabled: template.followUpEnabled,
        followUpCount: template.followUpCount,
        followUpDelayDays: template.followUpDelayDays,
        followUpInstructions: template.followUpInstructions || "",
        attachResume: template.attachResume,
        attachPortfolio: template.attachPortfolio,
        aiPromptOverride: template.aiPromptOverride || "",
      });
    }
  }, [template]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.category) return;

    if (isNew) {
      const created = await createTemplate.mutateAsync(form);
      router.push(`/templates/${created.id}`);
    } else {
      await updateTemplate.mutateAsync({ id, ...form });
    }
  };

  const updateField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (!isNew && isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-24 bg-surface-tertiary rounded mb-6" />
        <div className="h-8 w-48 bg-surface-tertiary rounded mb-8" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-surface-tertiary rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
    >
      <motion.div variants={fadeUp}>
        <Link
          href="/templates"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Templates
        </Link>
      </motion.div>

      <motion.div variants={fadeUp}>
        <PageHeader
          title={isNew ? "New Template" : "Edit Template"}
          description={isNew ? "Create a new outreach strategy template" : `Editing "${form.name}"`}
          action={
            <button
              onClick={handleSave}
              disabled={!form.name.trim() || updateTemplate.isPending || createTemplate.isPending}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                "bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Save className="w-4 h-4" />
              {updateTemplate.isPending || createTemplate.isPending ? "Saving..." : "Save"}
            </button>
          }
        />
      </motion.div>

      <motion.div variants={fadeUp} className="max-w-2xl space-y-6">
        {/* Basic Info */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Basic Information</h3>

          <div>
            <label className={labelClasses}>Template Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g., Startup Founder Cold Outreach"
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Category</label>
              <select
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className={inputClasses}
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Tone</label>
              <select
                value={form.tone}
                onChange={(e) => updateField("tone", e.target.value)}
                className={inputClasses}
              >
                {tones.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClasses}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe when to use this template..."
              rows={2}
              className={cn(inputClasses, "resize-none")}
            />
          </div>
        </section>

        <div className="border-t border-border" />

        {/* Email Rules */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Email Generation</h3>

          <div>
            <label className={labelClasses}>Subject Line Rules</label>
            <textarea
              value={form.subjectRules}
              onChange={(e) => updateField("subjectRules", e.target.value)}
              placeholder="Instructions for generating subject lines..."
              rows={3}
              className={cn(inputClasses, "resize-none")}
            />
          </div>

          <div>
            <label className={labelClasses}>Body Instructions</label>
            <textarea
              value={form.bodyInstructions}
              onChange={(e) => updateField("bodyInstructions", e.target.value)}
              placeholder="Instructions for generating email body..."
              rows={5}
              className={cn(inputClasses, "resize-none")}
            />
          </div>

          <div>
            <label className={labelClasses}>
              AI Prompt Override{" "}
              <span className="text-text-tertiary font-normal">(optional)</span>
            </label>
            <textarea
              value={form.aiPromptOverride}
              onChange={(e) => updateField("aiPromptOverride", e.target.value)}
              placeholder="Custom AI prompt to override defaults..."
              rows={3}
              className={cn(inputClasses, "resize-none")}
            />
          </div>
        </section>

        <div className="border-t border-border" />

        {/* Follow-ups */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Follow-up Settings</h3>

          <div className="flex items-center gap-3">
            <button
              onClick={() => updateField("followUpEnabled", !form.followUpEnabled)}
              className={cn(
                "relative w-9 h-5 rounded-full transition-colors duration-200",
                form.followUpEnabled ? "bg-accent-500" : "bg-neutral-300 dark:bg-neutral-700"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                  form.followUpEnabled && "translate-x-4"
                )}
              />
            </button>
            <span className="text-sm text-text-primary">Enable follow-ups</span>
          </div>

          {form.followUpEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Follow-up Count</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={form.followUpCount}
                  onChange={(e) => updateField("followUpCount", parseInt(e.target.value) || 1)}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Delay (days)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={form.followUpDelayDays}
                  onChange={(e) => updateField("followUpDelayDays", parseInt(e.target.value) || 3)}
                  className={inputClasses}
                />
              </div>
            </div>
          )}

          {form.followUpEnabled && (
            <div>
              <label className={labelClasses}>Follow-up Instructions</label>
              <textarea
                value={form.followUpInstructions}
                onChange={(e) => updateField("followUpInstructions", e.target.value)}
                placeholder="Instructions for generating follow-up emails..."
                rows={3}
                className={cn(inputClasses, "resize-none")}
              />
            </div>
          )}
        </section>

        <div className="border-t border-border" />

        {/* Attachments */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">Attachments</h3>

          <div className="flex items-center gap-3">
            <button
              onClick={() => updateField("attachResume", !form.attachResume)}
              className={cn(
                "relative w-9 h-5 rounded-full transition-colors duration-200",
                form.attachResume ? "bg-accent-500" : "bg-neutral-300 dark:bg-neutral-700"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                  form.attachResume && "translate-x-4"
                )}
              />
            </button>
            <span className="text-sm text-text-primary">Attach Resume</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => updateField("attachPortfolio", !form.attachPortfolio)}
              className={cn(
                "relative w-9 h-5 rounded-full transition-colors duration-200",
                form.attachPortfolio ? "bg-accent-500" : "bg-neutral-300 dark:bg-neutral-700"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                  form.attachPortfolio && "translate-x-4"
                )}
              />
            </button>
            <span className="text-sm text-text-primary">Attach Portfolio</span>
          </div>
        </section>
      </motion.div>
    </motion.div>
  );
}
