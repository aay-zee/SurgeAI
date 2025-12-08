"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  Bell,
  Moon,
  Sun,
  User,
  Settings,
  LogOut,
  Check,
  X,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";

const notifications = [
  {
    id: 1,
    title: "Campaign Performance Alert",
    message: "Your AI Marketing campaign exceeded 95% engagement rate",
    time: "2 min ago",
    type: "success",
    read: false,
  },
  {
    id: 2,
    title: "New Keyword Opportunity",
    message: "Found 5 high-potential keywords in Analytics",
    time: "15 min ago",
    type: "info",
    read: false,
  },
  {
    id: 3,
    title: "Weekly Report Ready",
    message: "Your weekly performance report is ready for download",
    time: "1 hour ago",
    type: "neutral",
    read: true,
  },
  {
    id: 4,
    title: "API Integration Update",
    message: "Successfully connected to new social media platform",
    time: "2 hours ago",
    type: "success",
    read: true,
  },
];

export function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-emerald-500";
      case "info":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className={`p-4 border-b transition-all duration-300 ${
        isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search
              size={20}
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${
                isDark ? "text-slate-400" : "text-gray-400"
              }`}
            />
            <Input
              type="text"
              placeholder="Search analytics, keywords..."
              className={`pl-10 transition-all duration-300 border-none focus:ring-2 ${
                isDark
                  ? "bg-slate-700 text-white placeholder-slate-400 focus:ring-cyan-500"
                  : "bg-gray-100 text-gray-900 placeholder-gray-500 focus:ring-blue-500"
              }`}
            />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all duration-300 ${
                isDark
                  ? "text-slate-400 hover:text-white hover:bg-slate-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <motion.div
                initial={false}
                animate={{ rotate: isDark ? 0 : 180 }}
                transition={{ duration: 0.3 }}
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </motion.div>
            </Button>
          </motion.div>

          {/* Notifications */}
          <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
            <PopoverTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={`relative p-2 rounded-xl transition-all duration-300 ${
                    isDark
                      ? "text-slate-400 hover:text-white hover:bg-slate-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full flex items-center justify-center"
                    >
                      <span className="text-white text-xs font-medium">
                        {unreadCount}
                      </span>
                    </motion.span>
                  )}
                </Button>
              </motion.div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end" sideOffset={5}>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Notifications</h3>
                    <Badge
                      variant="outline"
                      className="bg-gradient-to-r from-cyan-500 to-indigo-500 text-white border-none"
                    >
                      {unreadCount} new
                    </Badge>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer ${
                        !notification.read ? "bg-muted/30" : ""
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${
                            !notification.read
                              ? "bg-cyan-500"
                              : "bg-transparent"
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4
                              className={`text-sm font-medium ${
                                !notification.read
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {notification.title}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              {notification.time}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="p-4 border-t">
                  <Button variant="ghost" className="w-full text-sm">
                    View All Notifications
                  </Button>
                </div>
              </motion.div>
            </PopoverContent>
          </Popover>

          {/* Profile Avatar */}
          <Popover open={profileOpen} onOpenChange={setProfileOpen}>
            <PopoverTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <Button variant="ghost" size="sm" className="p-1 rounded-xl">
                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm font-medium">JD</span>
                  </div>
                </Button>
              </motion.div>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end" sideOffset={5}>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-4 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-xl flex items-center justify-center">
                      <span className="text-white font-medium">JD</span>
                    </div>
                    <div>
                      <h4 className="font-medium">John Doe</h4>
                      <p className="text-xs text-muted-foreground">
                        john@surgeai.com
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm h-9"
                    onClick={() => setProfileOpen(false)}
                  >
                    <User size={16} className="mr-3" />
                    My Profile
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm h-9"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Settings size={16} className="mr-3" />
                    Account Settings
                  </Button>

                  <Separator className="my-2" />

                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm h-9 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => setProfileOpen(false)}
                  >
                    <LogOut size={16} className="mr-3" />
                    Sign Out
                  </Button>
                </div>
              </motion.div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </motion.header>
  );
}
