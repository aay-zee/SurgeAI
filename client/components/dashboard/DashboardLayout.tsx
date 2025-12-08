"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

import { CampaignProvider } from "@/components/providers/CampaignProvider";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <CampaignProvider>
      <div className="min-h-screen transition-all duration-300 bg-background text-foreground">
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

          <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
            <Navbar />
            <main className="flex-1 overflow-auto p-4">{children}</main>

            {/* Footer */}
            <footer className="p-4 border-t transition-colors duration-300 bg-background border-border text-muted-foreground">
              <div className="text-center">
                <p>&copy; 2025 SurgeAI. All rights reserved.</p>
              </div>
            </footer>
          </div>
        </motion.div>
      </div>
    </CampaignProvider>
  );
}
