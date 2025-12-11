"use client";

import React from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Search,
  TrendingUp,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navigationItems = [
  { icon: BarChart3, label: "Dashboard", href: "/client" },
  {
    icon: PlusCircle,
    label: "Create a Campaign",
    href: "/client/campaigns",
  },
  { icon: Search, label: "Keywords", href: "/client/keywords" },
  { icon: TrendingUp, label: "Analytics", href: "/client/analytics" },
  {
    icon: MessageSquare,
    label: "Comments",
    href: "/client/comments",
  },
  { icon: Settings, label: "Settings", href: "/client/settings" },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { isDark } = useTheme();
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ width: 256 }}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.3,  }}
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
              <h1 className="text-white text-xl font-semibold">SurgeAI</h1>
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
          {navigationItems.map((item, index) => {
            const isActive =
              item.href === "/client"
                ? pathname === "/client"
                : pathname?.startsWith(item.href);

            return (
              <motion.li
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Link
                  href={item.href}
                  className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 hover:scale-105 group ${
                    isActive
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
                      className="text-sm font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </Link>
              </motion.li>
            );
          })}
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
              <span className="text-white text-sm font-medium">AI</span>
            </div>
            <div className="ml-3">
              <p className="text-white text-sm font-medium">AI Assistant</p>
              <p className="text-blue-300 text-xs">Always learning</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.aside>
  );
}
