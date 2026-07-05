"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";
import {
  LayoutDashboard,
  Bot,
  Users,
  Building,
  FolderHeart,
  RefreshCw,
  Layers,
  Mail,
  Phone,
  CheckSquare,
  Calendar,
  MessageSquare,
  DollarSign,
  GitBranch,
  BarChart3,
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Zap,
  TrendingUp,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navGroups = [
  {
    title: "",
    items: [
      { label: "Home", href: "/", icon: LayoutDashboard },
      { label: "AI Assistant", href: "/ai-assistant", icon: Bot },
    ],
  },
  {
    title: "Prospect and enrich",
    items: [
      { label: "People", href: "/search", icon: Users },
      { label: "Companies", href: "/companies", icon: Building },
      { label: "Lists", href: "/lists", icon: FolderHeart },
      { label: "Data enrichment", href: "/enrichment", icon: RefreshCw },
    ],
  },
  {
    title: "Engage",
    items: [
      { label: "Sequences", href: "/sequences", icon: Layers },
      { label: "Emails", href: "/emails", icon: Mail },
      { label: "Calls", href: "/calls", icon: Phone },
      { label: "Tasks", href: "/tasks", icon: CheckSquare },
    ],
  },
  {
    title: "Win deals",
    items: [
      { label: "Meetings", href: "/meetings", icon: Calendar },
      { label: "Conversations", href: "/conversations", icon: MessageSquare },
      { label: "Deals", href: "/deals", icon: DollarSign },
    ],
  },
  {
    title: "Tools and automation",
    items: [
      { label: "Workflows", href: "/workflows", icon: GitBranch },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const handleToggle = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("sidebar_collapsed", String(nextState));
  };

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "h-screen flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 select-none",
        "bg-sidebar-bg border-r border-sidebar-border text-gray-300",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Top Brand Area */}
      <div className="flex items-center gap-3 p-4 border-b border-sidebar-border h-16 shrink-0 overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center text-white shrink-0">
          <Zap className="w-4 h-4 fill-white" />
        </div>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <span className="text-sm font-bold text-white tracking-tight uppercase">Apollo.io</span>
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Outreach Clone</span>
          </motion.div>
        )}
      </div>

      {/* Navigation Scrollable Area */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4 scrollbar-thin">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!isCollapsed && group.title && (
              <p className="px-3 text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-1.5">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative group",
                      isActive
                        ? "bg-accent-500 text-white shadow-sm"
                        : "hover:bg-sidebar-hover text-gray-400 hover:text-white"
                    )}
                  >
                    <item.icon className={cn("w-4.5 h-4.5 shrink-0", isActive ? "text-white" : "text-gray-400 group-hover:text-white")} />
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}

                    {/* Collapse Mode Hover Tooltip */}
                    {isCollapsed && (
                      <span className="absolute left-full ml-4 px-2 py-1 bg-neutral-900 text-neutral-50 text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap border border-neutral-800 shadow-md">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Sticky Section */}
      <div className="p-2 border-t border-sidebar-border bg-sidebar-bg/95 backdrop-blur shrink-0 space-y-1">
        {/* Upgrade Pill */}
        {!isCollapsed ? (
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all duration-150 mb-2 cursor-pointer w-full justify-center text-center uppercase tracking-wider"
          >
            <TrendingUp className="w-4 h-4 text-yellow-500" />
            Upgrade Plan
          </Link>
        ) : (
          <Link
            href="/settings"
            title="Upgrade"
            className="flex items-center justify-center p-2 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all duration-150 mb-2 cursor-pointer"
          >
            <TrendingUp className="w-4.5 h-4.5" />
          </Link>
        )}

        {/* Deliverability Suite */}
        <Link
          href="/settings"
          title={isCollapsed ? "Deliverability Suite" : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-1.5 rounded-md text-xs text-gray-400 hover:text-white hover:bg-sidebar-hover transition-colors cursor-pointer"
          )}
        >
          <ShieldCheck className="w-4 h-4 text-gray-500" />
          {!isCollapsed && <span className="truncate">Deliverability suite</span>}
        </Link>

        {/* Admin Settings */}
        <Link
          href="/settings"
          title={isCollapsed ? "Admin Settings" : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-1.5 rounded-md text-xs text-gray-400 hover:text-white hover:bg-sidebar-hover transition-colors cursor-pointer"
          )}
        >
          <Settings className="w-4 h-4 text-gray-500" />
          {!isCollapsed && <span className="truncate">Admin Settings</span>}
        </Link>

        {/* Theme & Collapse Control Row */}
        <div className="flex items-center justify-between mt-2 pt-1 border-t border-sidebar-border/40">
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-sidebar-hover transition-colors cursor-pointer"
            title={resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
          >
            {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Collapse Toggle Button */}
          <button
            onClick={handleToggle}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-sidebar-hover transition-colors cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
