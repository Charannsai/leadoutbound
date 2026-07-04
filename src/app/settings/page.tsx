"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { PageHeader } from "@/components/common/page-header";
import {
  Settings as SettingsIcon,
  Key,
  Mail,
  Palette,
  Bot,
  Save,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";

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

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    gemini_api_key: "",
    gemini_model: "gemini-2.0-flash",
    apify_api_key: "",
    gmail_client_id: "",
    gmail_client_secret: "",
    gmail_redirect_uri: "https://ykiwsxkycybntfjklxvk.supabase.co/auth/v1/callback",
    sender_name: "",
    sender_email: "",
    email_signature: "",
  });

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (settings) {
      setForm((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(settings).filter(([key]) => key in prev)
        ),
      }));
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSettings.mutateAsync(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleKeyVisibility = (field: string) => {
    setShowKeys((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleConnectGmail = () => {
    if (!form.gmail_client_id || !form.gmail_client_secret) {
      alert("Please enter both OAuth Client ID and Client Secret first, and save settings.");
      return;
    }
    const scopes = [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email"
    ].join(" ");
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `response_type=code` +
      `&client_id=${encodeURIComponent(form.gmail_client_id)}` +
      `&redirect_uri=${encodeURIComponent(form.gmail_redirect_uri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&access_type=offline` +
      `&prompt=consent`;

    window.location.href = authUrl;
  };

  const handleDisconnectGmail = async () => {
    if (!confirm("Are you sure you want to disconnect your Gmail account?")) return;
    try {
      await updateSettings.mutateAsync({
        ...form,
        gmail_access_token: "",
        gmail_refresh_token: "",
        gmail_connected_email: "",
        gmail_token_expiry: ""
      });
      alert("Gmail disconnected successfully.");
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-32 bg-surface-tertiary rounded mb-2" />
        <div className="h-4 w-64 bg-surface-tertiary rounded mb-8" />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-surface-tertiary rounded-xl" />
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
        <PageHeader
          title="Settings"
          description="Configure your workspace, API keys, and preferences"
          action={
            <button
              onClick={handleSave}
              disabled={updateSettings.isPending}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                saved
                  ? "bg-success-500 text-white"
                  : "bg-accent-500 text-white hover:bg-accent-600",
                "disabled:opacity-50"
              )}
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {updateSettings.isPending ? "Saving..." : "Save Settings"}
                </>
              )}
            </button>
          }
        />
      </motion.div>

      <div className="max-w-2xl space-y-8">
        {/* AI Configuration */}
        <motion.section variants={fadeUp} className="space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-text-tertiary" />
            <h2 className="text-sm font-semibold text-text-primary">AI Configuration</h2>
          </div>

          <div>
            <label className={labelClasses}>Gemini API Key</label>
            <div className="relative">
              <input
                type={showKeys.gemini_api_key ? "text" : "password"}
                value={form.gemini_api_key}
                onChange={(e) => updateField("gemini_api_key", e.target.value)}
                placeholder="Enter your Gemini API key"
                className={cn(inputClasses, "pr-10")}
              />
              <button
                type="button"
                onClick={() => toggleKeyVisibility("gemini_api_key")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
              >
                {showKeys.gemini_api_key ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClasses}>Gemini Model</label>
            <select
              value={form.gemini_model}
              onChange={(e) => updateField("gemini_model", e.target.value)}
              className={inputClasses}
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            </select>
          </div>
        </motion.section>

        <div className="border-t border-border" />

        {/* Apify */}
        <motion.section variants={fadeUp} className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-text-tertiary" />
            <h2 className="text-sm font-semibold text-text-primary">Apify Integration</h2>
          </div>

          <div>
            <label className={labelClasses}>Apify API Key</label>
            <div className="relative">
              <input
                type={showKeys.apify_api_key ? "text" : "password"}
                value={form.apify_api_key}
                onChange={(e) => updateField("apify_api_key", e.target.value)}
                placeholder="Enter your Apify API key"
                className={cn(inputClasses, "pr-10")}
              />
              <button
                type="button"
                onClick={() => toggleKeyVisibility("apify_api_key")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
              >
                {showKeys.apify_api_key ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </motion.section>

        <div className="border-t border-border" />

        {/* Gmail */}
        <motion.section variants={fadeUp} className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-text-tertiary" />
            <h2 className="text-sm font-semibold text-text-primary">Gmail Connection</h2>
          </div>

          <div>
            <label className={labelClasses}>OAuth Client ID</label>
            <input
              type="text"
              value={form.gmail_client_id}
              onChange={(e) => updateField("gmail_client_id", e.target.value)}
              placeholder="Google Cloud OAuth Client ID"
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>OAuth Client Secret</label>
            <div className="relative">
              <input
                type={showKeys.gmail_client_secret ? "text" : "password"}
                value={form.gmail_client_secret}
                onChange={(e) => updateField("gmail_client_secret", e.target.value)}
                placeholder="Google Cloud OAuth Client Secret"
                className={cn(inputClasses, "pr-10")}
              />
              <button
                type="button"
                onClick={() => toggleKeyVisibility("gmail_client_secret")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
              >
                {showKeys.gmail_client_secret ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClasses}>OAuth Redirect URI</label>
            <input
              type="text"
              value={form.gmail_redirect_uri}
              onChange={(e) => updateField("gmail_redirect_uri", e.target.value)}
              className={inputClasses}
              placeholder="e.g. http://localhost:3000/api/auth/google/callback"
            />
          </div>

          <div className="pt-2">
            {settings?.gmail_connected_email ? (
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-success-500/20 bg-success-500/5 text-xs text-text-primary">
                <div>
                  <span className="font-semibold block">Gmail Connected</span>
                  <span className="text-text-secondary text-[11px] mt-0.5 block">Authorized account: {settings.gmail_connected_email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnectGmail}
                  className="px-3 py-1.5 rounded-lg border border-danger-500/20 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors font-semibold"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-border bg-surface-secondary/40">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-text-primary block">Gmail Account: Disconnected</span>
                  <span className="text-[10px] text-text-tertiary block">Enter credentials, save, and connect to enable live outreach sending.</span>
                </div>
                <button
                  type="button"
                  onClick={handleConnectGmail}
                  className="px-4 py-2 shrink-0 rounded-lg text-xs font-semibold bg-accent-500 text-white hover:bg-accent-600 transition-colors"
                >
                  Connect Gmail Account
                </button>
              </div>
            )}
          </div>
        </motion.section>

        <div className="border-t border-border" />

        {/* Sender Identity */}
        <motion.section variants={fadeUp} className="space-y-4">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-text-tertiary" />
            <h2 className="text-sm font-semibold text-text-primary">Sender Identity</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Sender Name</label>
              <input
                type="text"
                value={form.sender_name}
                onChange={(e) => updateField("sender_name", e.target.value)}
                placeholder="Your name"
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Sender Email</label>
              <input
                type="email"
                value={form.sender_email}
                onChange={(e) => updateField("sender_email", e.target.value)}
                placeholder="your@email.com"
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <label className={labelClasses}>Email Signature</label>
            <textarea
              value={form.email_signature}
              onChange={(e) => updateField("email_signature", e.target.value)}
              placeholder="Your email signature..."
              rows={4}
              className={cn(inputClasses, "resize-none")}
            />
          </div>
        </motion.section>

        <div className="border-t border-border" />

        {/* Theme */}
        <motion.section variants={fadeUp} className="space-y-4 pb-8">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-text-tertiary" />
            <h2 className="text-sm font-semibold text-text-primary">Appearance</h2>
          </div>

          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150",
                  theme === t
                    ? "border-accent-500 bg-accent-500/10 text-accent-500"
                    : "border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                )}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
