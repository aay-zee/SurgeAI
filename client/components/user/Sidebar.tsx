"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Search,
  TrendingUp,
  MessageCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Keywords",
    href: "/dashboard/keywords",
    icon: Search,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: TrendingUp,
  },
  {
    name: "Comments",
    href: "/dashboard/comments",
    icon: MessageCircle,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { isDark } = useTheme();
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`${
        isCollapsed ? "w-16" : "w-64"
      } transition-all duration-300 ${
        isDark ? "bg-slate-900 border-slate-700" : "bg-blue-900 border-blue-800"
      } border-r flex flex-col`}
    >
      {/* Header */}
      <div className="p-4 border-b border-blue-800/30">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-white font-semibold text-lg">SurgeAI</span>
            </motion.div>
          )}

          <button
            onClick={onToggle}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isDark
                ? "hover:bg-slate-800 text-slate-300 hover:text-white"
                : "hover:bg-blue-800 text-blue-200 hover:text-white"
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? isDark
                      ? "bg-slate-800 text-cyan-400 shadow-lg shadow-cyan-400/20"
                      : "bg-blue-800 text-cyan-400 shadow-lg shadow-cyan-400/20"
                    : isDark
                    ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "text-blue-200 hover:bg-blue-800 hover:text-white"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-all duration-200 ${
                    isActive ? "text-cyan-400" : "group-hover:scale-110"
                  }`}
                />

                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-medium"
                  >
                    {item.name}
                  </motion.span>
                )}

                {isActive && !isCollapsed && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-2 h-2 bg-cyan-400 rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className={`p-4 border-t ${
          isDark ? "border-slate-700" : "border-blue-800/30"
        }`}
      >
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`text-xs ${
              isDark ? "text-slate-400" : "text-blue-300"
            } text-center`}
          >
            v2.1.0 • AI-Powered
          </motion.div>
        )}
      </div>
    </motion.aside>
  );
}
