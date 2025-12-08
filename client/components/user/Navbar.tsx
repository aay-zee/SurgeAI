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
    message: "Your comprehensive analytics report is now available",
    time: "1 hour ago",
    type: "info",
    read: true,
  },
  {
    id: 4,
    title: "Sentiment Analysis Update",
    message: "Detected significant positive sentiment shift (+12%)",
    time: "3 hours ago",
    type: "success",
    read: true,
  },
];

export function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  const [searchValue, setSearchValue] = useState("");
  const [notificationList, setNotificationList] = useState(notifications);

  const unreadCount = notificationList.filter((n) => !n.read).length;

  const markAsRead = (id: number) => {
    setNotificationList((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const markAllAsRead = () => {
    setNotificationList((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
  };

  const clearNotification = (id: number) => {
    setNotificationList((prev) => prev.filter((notif) => notif.id !== id));
  };

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`${
        isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
      } border-b px-6 py-4 transition-colors duration-300`}
    >
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-md relative">
          <Search
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
              isDark ? "text-slate-400" : "text-gray-400"
            }`}
          />
          <Input
            placeholder="Search keywords, campaigns, or analytics..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className={`pl-10 transition-all duration-200 ${
              isDark
                ? "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400 focus:bg-slate-600"
                : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:bg-white"
            }`}
          />
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className={`p-2 transition-all duration-200 ${
                isDark
                  ? "hover:bg-slate-700 text-slate-300"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" />
              )}
            </Button>
          </motion.div>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={`p-2 relative transition-all duration-200 ${
                    isDark
                      ? "hover:bg-slate-700 text-slate-300"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                    >
                      {unreadCount}
                    </motion.div>
                  )}
                </Button>
              </motion.div>
            </PopoverTrigger>
            <PopoverContent
              className={`w-80 p-0 ${
                isDark
                  ? "bg-slate-800 border-slate-700"
                  : "bg-white border-gray-200"
              }`}
              align="end"
            >
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3
                    className={`font-semibold ${
                      isDark ? "text-slate-100" : "text-gray-900"
                    }`}
                  >
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notificationList.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No notifications
                  </div>
                ) : (
                  notificationList.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 border-b border-gray-100 dark:border-slate-700 transition-all duration-200 ${
                        !notification.read
                          ? isDark
                            ? "bg-slate-700/50"
                            : "bg-blue-50"
                          : "hover:bg-gray-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4
                              className={`text-sm font-medium ${
                                isDark ? "text-slate-100" : "text-gray-900"
                              }`}
                            >
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <p
                            className={`text-sm mt-1 ${
                              isDark ? "text-slate-300" : "text-gray-600"
                            }`}
                          >
                            {notification.message}
                          </p>
                          <p
                            className={`text-xs mt-2 ${
                              isDark ? "text-slate-400" : "text-gray-400"
                            }`}
                          >
                            {notification.time}
                          </p>
                        </div>

                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 h-6 w-6"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearNotification(notification.id)}
                            className="p-1 h-6 w-6"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Profile Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={`p-2 rounded-full transition-all duration-200 ${
                    isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"
                  }`}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                </Button>
              </motion.div>
            </PopoverTrigger>
            <PopoverContent
              className={`w-56 p-0 ${
                isDark
                  ? "bg-slate-800 border-slate-700"
                  : "bg-white border-gray-200"
              }`}
              align="end"
            >
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p
                      className={`font-medium ${
                        isDark ? "text-slate-100" : "text-gray-900"
                      }`}
                    >
                      John Doe
                    </p>
                    <p
                      className={`text-sm ${
                        isDark ? "text-slate-400" : "text-gray-500"
                      }`}
                    >
                      john@surgeai.com
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left p-2 h-auto"
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Settings
                </Button>
                <Separator className="my-2" />
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left p-2 h-auto text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sign out
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </motion.header>
  );
}
