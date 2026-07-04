"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";
import {
  LayoutDashboard,
  Layers,
  Search,
  FileText,
  GitBranch,
  Inbox,
  BarChart3,
  BookOpen,
  Settings,
  Sun,
  Moon,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Sessions", href: "/sessions", icon: Layers },
  { label: "Search", href: "/search", icon: Search },
  { label: "Templates", href: "/templates", icon: FileText },
  { label: "Pipeline", href: "/pipeline", icon: GitBranch },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Knowledge Base", href: "/knowledge", icon: BookOpen },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 select-none pointer-events-none">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 25 }}
        className="pointer-events-auto flex items-center gap-1.5 p-2 rounded-full border border-neutral-200/60 dark:border-neutral-800/60 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.12)] transition-all duration-300 hover:scale-[1.01]"
      >
        {/* Brand Accent Badge */}
        <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-neutral-50 flex items-center justify-center text-white dark:text-neutral-950 shadow-sm shrink-0 mr-1 select-none">
          <Zap className="w-4 h-4" />
        </div>

        {/* Separator line */}
        <div className="w-[1px] h-5 bg-neutral-200 dark:bg-neutral-800 mx-1 shrink-0" />

        {/* Navigation Items horizontal layout */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 relative active:scale-95",
                  isActive
                    ? "text-text-primary"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {/* Active Indicator Capsule */}
                {isActive && (
                  <motion.span
                    layoutId="activeDockBg"
                    className="absolute inset-0 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/40 dark:border-neutral-800/40 rounded-full -z-10 shadow-[0_2px_8px_rgba(0,0,0,0.015)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}

                <item.icon className="w-4.5 h-4.5" />

                {/* Micro Tooltip */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 px-3 py-1.5 rounded-xl text-[9px] font-bold tracking-wider uppercase bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-950 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 pointer-events-none transition-all duration-200 shadow-lg border border-neutral-800 dark:border-neutral-200/20 whitespace-nowrap">
                  {item.label}
                </span>

                {/* Selected Accent Dot */}
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 bg-neutral-900 dark:bg-neutral-50 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Divider line */}
        <div className="w-[1px] h-5 bg-neutral-200 dark:bg-neutral-800 mx-1 shrink-0" />

        {/* Theme Toggle Trigger */}
        <button
          onClick={toggleTheme}
          className="group relative flex items-center justify-center w-9 h-9 rounded-full text-text-secondary hover:text-text-primary active:scale-95 transition-all duration-200 cursor-pointer"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="w-4.5 h-4.5 text-text-tertiary group-hover:text-text-primary" />
          ) : (
            <Moon className="w-4.5 h-4.5 text-text-tertiary group-hover:text-text-primary" />
          )}

          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 px-3 py-1.5 rounded-xl text-[9px] font-bold tracking-wider uppercase bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-950 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 pointer-events-none transition-all duration-200 shadow-lg border border-neutral-800 dark:border-neutral-200/20 whitespace-nowrap">
            {resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
      </motion.div>
    </div>
  );
}
