"use client";

import React from "react";
import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Search,
  TrendingUp,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

type NavigationPage =
  | "dashboard"
  | "keywords"
  | "analytics"
  | "comments"
  | "settings";

const navigationItems = [
  {
    icon: BarChart3,
    label: "Dashboard",
    page: "dashboard" as NavigationPage,
    href: "/",
  },
  {
    icon: Search,
    label: "Keywords",
    page: "keywords" as NavigationPage,
    href: "/keywords",
  },
  {
    icon: TrendingUp,
    label: "Analytics",
    page: "analytics" as NavigationPage,
    href: "/analytics",
  },
  {
    icon: MessageSquare,
    label: "Comments",
    page: "comments" as NavigationPage,
    href: "/comments",
  },
  {
    icon: Settings,
    label: "Settings",
    page: "settings" as NavigationPage,
    href: "/settings",
  },
];

export function SidebarNext({ isCollapsed, onToggle }: SidebarProps) {
  const { isDark } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      initial={{ width: 256 }}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`relative flex flex-col transition-colors duration-300 ${
        isDark ? "bg-slate-900" : "bg-blue-900"
      }`}
    >
      {/* Header */}
      <div className="p-6 border-b border-blue-800/50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-white">SurgeAI</h1>
            </motion.div>
          )}

          <button
            onClick={onToggle}
            className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
              isDark
                ? "text-slate-400 hover:text-white hover:bg-slate-800"
                : "text-blue-300 hover:text-white hover:bg-blue-800"
            }`}
          >
            {isCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <ChevronLeft size={20} />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item, index) => (
            <motion.li
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <button
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 hover:scale-105 group ${
                  isActive(item.href)
                    ? isDark
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-cyan-500/20 text-cyan-300"
                    : isDark
                    ? "text-slate-400 hover:text-white hover:bg-slate-800"
                    : "text-blue-300 hover:text-white hover:bg-blue-800"
                }`}
              >
                <item.icon
                  size={20}
                  className={`transition-transform duration-200 group-hover:scale-110 ${
                    isCollapsed ? "mx-auto" : "mr-3"
                  }`}
                />
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>
            </motion.li>
          ))}
        </ul>
      </nav>

      {/* User Section */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="p-4 border-t border-blue-800/50"
        >
          <div className="flex items-center p-3 rounded-xl bg-blue-800/30">
            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-white">AI</span>
            </div>
            <div className="ml-3">
              <p className="text-white">AI Assistant</p>
              <p className="text-blue-300">Always learning</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.aside>
  );
}
