import React, { useState } from "react";
import { motion } from "motion/react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Users,
  Eye,
  MousePointerClick,
  ArrowUp,
  ArrowDown,
  Calendar,
  DollarSign,
  Filter,
  Download,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCampaign } from "@/components/providers/CampaignProvider";

const timeSeriesData = [
  { date: "2024-01", visitors: 12400, conversions: 850, revenue: 25600 },
  { date: "2024-02", visitors: 13200, conversions: 920, revenue: 28400 },
  { date: "2024-03", visitors: 14800, conversions: 1120, revenue: 34200 },
  { date: "2024-04", visitors: 16200, conversions: 1350, revenue: 42800 },
  { date: "2024-05", visitors: 18600, conversions: 1580, revenue: 48900 },
  { date: "2024-06", visitors: 20100, conversions: 1750, revenue: 52600 },
  { date: "2024-07", visitors: 22400, conversions: 1920, revenue: 58400 },
  { date: "2024-08", visitors: 25800, conversions: 2240, revenue: 67200 },
  { date: "2024-09", visitors: 28900, conversions: 2580, revenue: 76800 },
  { date: "2024-10", visitors: 32100, conversions: 2890, revenue: 86400 },
];

const channelData = [
  { channel: "Organic Search", visitors: 45600, percentage: 42 },
  { channel: "Social Media", visitors: 28400, percentage: 26 },
  { channel: "Direct", visitors: 19200, percentage: 18 },
  { channel: "Email", visitors: 10800, percentage: 10 },
  { channel: "Paid Ads", visitors: 4320, percentage: 4 },
];

const deviceData = [
  { device: "Desktop", sessions: 58400, percentage: 54 },
  { device: "Mobile", sessions: 41200, percentage: 38 },
  { device: "Tablet", sessions: 8640, percentage: 8 },
];

export function AnalyticsContent() {
  const { isDark } = useTheme();
  // TODO: Use selectedCampaignId to filter analytics data
  const { selectedCampaignId } = useCampaign();
  const [selectedMetric, setSelectedMetric] = useState("visitors");
  const [timeRange, setTimeRange] = useState("10m");

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-3 rounded-lg shadow-lg border ${
            isDark
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-gray-200"
          }`}
        >
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const metricOptions = [
    { key: "visitors", label: "Visitors", color: "#06b6d4" },
    { key: "conversions", label: "Conversions", color: "#10b981" },
    { key: "revenue", label: "Revenue", color: "#8b5cf6" },
  ];

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
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Analytics Overview</h1>
              <p className="text-muted-foreground">
                Comprehensive insights into your marketing performance
              </p>
            </div>

            <div className="flex gap-2 mt-4 md:mt-0">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-white"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="3m">Last 3 months</option>
                <option value="10m">Last 10 months</option>
              </select>

              <Button variant="outline" size="sm">
                <Filter size={16} className="mr-2" />
                Filter
              </Button>

              <Button
                size="sm"
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 text-white"
              >
                <Download size={16} className="mr-2" />
                Export
              </Button>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          {[
            {
              title: "Total Visitors",
              value: "32.1K",
              change: "+12.5%",
              icon: Users,
              color: "cyan",
            },
            {
              title: "Conversion Rate",
              value: "9.2%",
              change: "+2.1%",
              icon: MousePointerClick,
              color: "emerald",
            },
            {
              title: "Revenue",
              value: "$86.4K",
              change: "+18.3%",
              icon: DollarSign,
              color: "purple",
            },
            {
              title: "Avg. Session",
              value: "3m 24s",
              change: "+8.7%",
              icon: TrendingUp,
              color: "indigo",
            },
          ].map((kpi, index) => (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-${kpi.color}-500/20`}>
                    <kpi.icon size={20} className={`text-${kpi.color}-500`} />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-emerald-500 border-emerald-500/30"
                  >
                    {kpi.change}
                  </Badge>
                </div>
                <h3 className="text-2xl font-bold mb-1">{kpi.value}</h3>
                <p className="text-sm text-muted-foreground">{kpi.title}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Chart */}
        <motion.div variants={itemVariants} className="mb-8">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Performance Trends</h3>
              <div className="flex gap-2 mt-4 md:mt-0">
                {metricOptions.map((option) => (
                  <Button
                    key={option.key}
                    variant={
                      selectedMetric === option.key ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedMetric(option.key)}
                    className="transition-all duration-200"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient
                      id="colorGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={
                          metricOptions.find((m) => m.key === selectedMetric)
                            ?.color
                        }
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={
                          metricOptions.find((m) => m.key === selectedMetric)
                            ?.color
                        }
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#374151" : "#e5e7eb"}
                  />
                  <XAxis
                    dataKey="date"
                    stroke={isDark ? "#9ca3af" : "#6b7280"}
                    fontSize={12}
                  />
                  <YAxis
                    stroke={isDark ? "#9ca3af" : "#6b7280"}
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey={selectedMetric}
                    stroke={
                      metricOptions.find((m) => m.key === selectedMetric)?.color
                    }
                    strokeWidth={3}
                    fill="url(#colorGradient)"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Traffic Sources and Device Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Traffic Sources</h3>
              <div className="space-y-4">
                {channelData.map((channel, index) => (
                  <motion.div
                    key={channel.channel}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: `hsl(${200 + index * 40}, 70%, 50%)`,
                        }}
                      />
                      <span className="font-medium">{channel.channel}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-muted-foreground">
                        {channel.visitors.toLocaleString()}
                      </span>
                      <div className="w-20 bg-muted rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${channel.percentage}%` }}
                          transition={{ delay: index * 0.1, duration: 0.8 }}
                          className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                        />
                      </div>
                      <span className="text-sm font-medium w-8">
                        {channel.percentage}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Device Breakdown</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deviceData} layout="horizontal">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "#374151" : "#e5e7eb"}
                    />
                    <XAxis
                      type="number"
                      stroke={isDark ? "#9ca3af" : "#6b7280"}
                      fontSize={12}
                    />
                    <YAxis
                      type="category"
                      dataKey="device"
                      stroke={isDark ? "#9ca3af" : "#6b7280"}
                      fontSize={12}
                      width={60}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="sessions"
                      fill="url(#deviceGradient)"
                      radius={[0, 4, 4, 0]}
                      animationDuration={1000}
                    >
                      <defs>
                        <linearGradient
                          id="deviceGradient"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
