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
        "bg-sidebar-bg border-r border-sidebar-border text-text-secondary",
        isCollapsed ? "w-16" : "w-52"
      )}
    >
      {/* Top Brand Area */}
      <div className="flex items-center gap-3.5 p-3 border-b border-sidebar-border h-12 shrink-0 overflow-hidden">
        <div className="w-6.5 h-6.5 rounded-lg bg-sidebar-active-bg border border-sidebar-border/40 flex items-center justify-center text-yellow-500 shrink-0">
          <Zap className="w-3.5 h-3.5 fill-yellow-500" />
        </div>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <span className="text-xs font-bold text-text-primary tracking-tight uppercase">Apollo.io</span>
            <span className="text-[9px] text-text-tertiary font-semibold uppercase tracking-wider">Outreach</span>
          </motion.div>
        )}
      </div>

      {/* Navigation Scrollable Area */}
      <div className="flex-1 overflow-y-auto py-2 px-1.5 space-y-2.5 scrollbar-thin">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-0.5">
            {!isCollapsed && group.title && (
              <p className="px-2 text-[9px] font-bold text-text-tertiary tracking-wider uppercase mb-1">
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
                      "flex items-center gap-2.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 relative group",
                      isActive
                        ? "bg-sidebar-active-bg text-sidebar-active-text border border-sidebar-border/30 shadow-sm"
                        : "hover:bg-sidebar-hover text-sidebar-inactive-text hover:text-sidebar-hover-text"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-sidebar-active-text" : "text-sidebar-inactive-text group-hover:text-sidebar-hover-text")} />
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
      <div className="p-2 border-t border-sidebar-border bg-sidebar-bg/95 backdrop-blur shrink-0">
        <div className={cn("flex text-gray-400", isCollapsed ? "flex-col items-center gap-2 py-1" : "flex-row items-center justify-between px-2")}>
          {/* Settings Link */}
          <Link
            href="/settings"
            className="p-1 rounded-md hover:text-white hover:bg-sidebar-hover transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-1 rounded-md hover:text-white hover:bg-sidebar-hover transition-colors cursor-pointer"
            title={resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
          >
            {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Collapse Toggle Button */}
          <button
            onClick={handleToggle}
            className="p-1 rounded-md hover:text-white hover:bg-sidebar-hover transition-colors cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
