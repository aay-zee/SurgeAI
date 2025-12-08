"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { useTheme } from "@/components/theme-provider";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${
        isDark ? "bg-slate-900" : "bg-gray-50"
      }`}
    >
      <motion.div
        className="flex h-screen overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-auto">{children}</main>

          {/* Footer */}
          <footer
            className={`p-4 border-t transition-colors duration-300 ${
              isDark
                ? "bg-slate-800 border-slate-700 text-slate-400"
                : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            <div className="text-center">
              <p>&copy; 2024 SurgeAI. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </motion.div>
    </div>
  );
}
