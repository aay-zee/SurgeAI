"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  Bell,
  Moon,
  Sun,
  User as UserIcon,
  Settings,
  LogOut,
  Check,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { User } from "@/types/auth";
import { useTheme } from "@/components/theme-provider";
import { useCampaign } from "@/components/providers/CampaignProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const { selectedCampaignId, setSelectedCampaignId, campaigns } =
    useCampaign();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      router.push("/login");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="p-4 border-b transition-all duration-300 bg-background border-border sticky top-0 z-10"
    >
      <div className="flex items-center justify-between">
        {/* Campaign Selector (Replaces Search Bar) */}
        <div className="flex-1 max-w-md">
          <Select
            value={selectedCampaignId}
            onValueChange={setSelectedCampaignId}
          >
            <SelectTrigger className="w-full h-10 rounded-lg border bg-card text-foreground border-border focus:ring-2 focus:ring-cyan-500/30 transition-all duration-300">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground mr-1">Campaign:</span>
                <SelectValue placeholder="Select campaign" />
              </div>
            </SelectTrigger>
            <SelectContent className="select-content-solid rounded-lg border shadow-lg bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700">
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
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
                  size="icon"
                  className="rounded-full relative"
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
            <PopoverContent
              className="w-80 p-0 bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-md"
              align="end"
              sideOffset={5}
            >
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
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl relative"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.full_name
                      ? user.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "U"}
                  </span>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56 p-0 bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-md"
              align="end"
              sideOffset={5}
            >
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-4 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-xl flex items-center justify-center">
                      <span className="text-white font-medium">
                        {user?.full_name
                          ? user.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)
                          : "U"}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">
                        {user?.full_name || "User"}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate w-32">
                        {user?.email || ""}
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
                    <UserIcon size={16} className="mr-3" />
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
                    onClick={handleLogout}
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
