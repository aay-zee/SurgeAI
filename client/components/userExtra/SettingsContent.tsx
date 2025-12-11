"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Save,
  Key,
  Bell,
  User,
  Lock,
  Mail,
  Phone,
  Globe,
  Shield,
  Zap,
  Database,
  Webhook,
  Code,
  Link,
  Copy,
  Eye,
  EyeOff,
  Palette,
  Upload,
  Download,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";

const apiKeys = [
  { name: "Google Analytics", status: "connected", lastUsed: "2 hours ago" },
  { name: "Facebook API", status: "connected", lastUsed: "1 day ago" },
  { name: "Twitter API", status: "disconnected", lastUsed: "Never" },
  { name: "LinkedIn API", status: "connected", lastUsed: "3 hours ago" },
];

export function SettingsContent() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("profile");
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyReports: true,
    realTimeAlerts: true,
    dataRetention: "12months",
    timezone: "UTC-8",
    language: "en",
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        
      },
    },
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "integrations", label: "Integrations", icon: Database },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "advanced", label: "Advanced", icon: Globe },
  ];

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const getStatusColor = (status: string) => {
    if (status === "connected")
      return "bg-emerald-500/20 text-emerald-600 border-emerald-500/30";
    return "bg-red-500/20 text-red-600 border-red-500/30";
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Profile Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Full Name
                  </label>
                  <Input placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <Input placeholder="john@example.com" type="email" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Company
                  </label>
                  <Input placeholder="SurgeAI Inc." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <Input placeholder="Marketing Manager" />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Profile Picture</h3>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl font-bold">JD</span>
                </div>
                <div>
                  <Button variant="outline" className="mr-2">
                    <Upload size={16} className="mr-2" />
                    Upload New
                  </Button>
                  <Button variant="ghost">Remove</Button>
                </div>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Notification Preferences
              </h3>
              <div className="space-y-4">
                {[
                  {
                    key: "emailNotifications",
                    label: "Email Notifications",
                    desc: "Receive updates via email",
                  },
                  {
                    key: "pushNotifications",
                    label: "Push Notifications",
                    desc: "Browser push notifications",
                  },
                  {
                    key: "weeklyReports",
                    label: "Weekly Reports",
                    desc: "Weekly performance summaries",
                  },
                  {
                    key: "realTimeAlerts",
                    label: "Real-time Alerts",
                    desc: "Instant alerts for important events",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div>
                      <h4 className="font-medium">{item.label}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                    <Switch
                      checked={
                        settings[item.key as keyof typeof settings] as boolean
                      }
                      onCheckedChange={(checked) =>
                        handleSettingChange(item.key, checked)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Password & Security
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Current Password
                  </label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    New Password
                  </label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Confirm Password
                  </label>
                  <Input type="password" placeholder="••••••••" />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">
                Two-Factor Authentication
              </h3>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-medium">Enable 2FA</h4>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security
                  </p>
                </div>
                <Button variant="outline">Setup</Button>
              </div>
            </div>
          </div>
        );

      case "integrations":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">API Connections</h3>
              <div className="space-y-4">
                {apiKeys.map((api, index) => (
                  <motion.div
                    key={api.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      <Key size={20} className="text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">{api.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Last used: {api.lastUsed}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge
                        variant="outline"
                        className={getStatusColor(api.status)}
                      >
                        {api.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        {api.status === "connected" ? "Disconnect" : "Connect"}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Custom API Key</h3>
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <Input
                    type={showApiKey === "custom" ? "text" : "password"}
                    placeholder="Enter your API key"
                    value="sk-abc123..."
                  />
                  <button
                    onClick={() =>
                      setShowApiKey(showApiKey === "custom" ? null : "custom")
                    }
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showApiKey === "custom" ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
                <Button>Save</Button>
              </div>
            </div>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Theme Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-full h-20 bg-gray-100 rounded mb-3"></div>
                  <h4 className="font-medium">Light Mode</h4>
                  <p className="text-sm text-muted-foreground">
                    Clean and bright interface
                  </p>
                </div>
                <div className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-full h-20 bg-gray-800 rounded mb-3"></div>
                  <h4 className="font-medium">Dark Mode</h4>
                  <p className="text-sm text-muted-foreground">
                    Easy on the eyes
                  </p>
                </div>
                <div className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-full h-20 bg-gradient-to-r from-gray-100 to-gray-800 rounded mb-3"></div>
                  <h4 className="font-medium">Auto</h4>
                  <p className="text-sm text-muted-foreground">
                    Follow system preference
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Language & Region</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Language
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) =>
                      handleSettingChange("language", e.target.value)
                    }
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-slate-800 border-slate-700 text-white"
                        : "bg-white border-gray-200 text-gray-900"
                    }`}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) =>
                      handleSettingChange("timezone", e.target.value)
                    }
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-slate-800 border-slate-700 text-white"
                        : "bg-white border-gray-200 text-gray-900"
                    }`}
                  >
                    <option value="UTC-8">Pacific Time (UTC-8)</option>
                    <option value="UTC-5">Eastern Time (UTC-5)</option>
                    <option value="UTC+0">UTC</option>
                    <option value="UTC+1">Central European Time (UTC+1)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case "advanced":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Data Management</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Data Retention Period
                  </label>
                  <select
                    value={settings.dataRetention}
                    onChange={(e) =>
                      handleSettingChange("dataRetention", e.target.value)
                    }
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-slate-800 border-slate-700 text-white"
                        : "bg-white border-gray-200 text-gray-900"
                    }`}
                  >
                    <option value="3months">3 Months</option>
                    <option value="6months">6 Months</option>
                    <option value="12months">12 Months</option>
                    <option value="24months">24 Months</option>
                  </select>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" className="flex-1">
                    <Download size={16} className="mr-2" />
                    Export Data
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Upload size={16} className="mr-2" />
                    Import Data
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4 text-red-600">
                Danger Zone
              </h3>
              <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
                <h4 className="font-medium mb-2">Delete Account</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Permanently delete your account and all associated data. This
                  action cannot be undone.
                </p>
                <Button variant="destructive">Delete Account</Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <Card className="p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 hover:scale-105 ${
                      activeTab === tab.id
                        ? isDark
                          ? "bg-cyan-500/20 text-cyan-400"
                          : "bg-cyan-500/20 text-cyan-600"
                        : isDark
                        ? "text-slate-400 hover:text-white hover:bg-slate-800"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <tab.icon size={20} />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </Card>
          </motion.div>

          {/* Main Content */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <Card className="p-6">
              {renderTabContent()}

              <Separator className="my-6" />

              <div className="flex justify-end space-x-2">
                <Button variant="outline">Cancel</Button>
                <Button className="bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 text-white">
                  <Save size={16} className="mr-2" />
                  Save Changes
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
