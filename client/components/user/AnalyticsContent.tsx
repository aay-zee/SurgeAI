import React, { useState } from "react";
import { motion } from "motion/react";
import {
  TrendingUp,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
} from "lucide-react";
import { useTheme } from "../theme-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

const analyticsData = [
  {
    month: "Jan",
    engagement: 65,
    clicks: 2400,
    impressions: 32000,
    conversions: 145,
  },
  {
    month: "Feb",
    engagement: 72,
    clicks: 2800,
    impressions: 35000,
    conversions: 168,
  },
  {
    month: "Mar",
    engagement: 78,
    clicks: 3200,
    impressions: 38000,
    conversions: 192,
  },
  {
    month: "Apr",
    engagement: 85,
    clicks: 3600,
    impressions: 42000,
    conversions: 215,
  },
  {
    month: "May",
    engagement: 89,
    clicks: 4100,
    impressions: 45000,
    conversions: 248,
  },
  {
    month: "Jun",
    engagement: 92,
    clicks: 4500,
    impressions: 48000,
    conversions: 275,
  },
];

const channelData = [
  { name: "Organic Search", value: 45, color: "#3B82F6" },
  { name: "Social Media", value: 25, color: "#10B981" },
  { name: "Email Marketing", value: 15, color: "#F59E0B" },
  { name: "Paid Ads", value: 10, color: "#EF4444" },
  { name: "Direct", value: 5, color: "#8B5CF6" },
];

export function AnalyticsContent() {
  const { isDark } = useTheme();
  const [timeRange, setTimeRange] = useState("6m");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive insights into your marketing performance and user
            behavior.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Last 6 months
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {[
          {
            label: "Total Traffic",
            value: "284.5K",
            change: "+18.2%",
            trend: "up",
            icon: TrendingUp,
          },
          {
            label: "Engagement Rate",
            value: "92.4%",
            change: "+5.7%",
            trend: "up",
            icon: BarChart3,
          },
          {
            label: "Conversions",
            value: "1,243",
            change: "+24.1%",
            trend: "up",
            icon: PieChart,
          },
          {
            label: "Revenue",
            value: "$47.2K",
            change: "+31.5%",
            trend: "up",
            icon: TrendingUp,
          },
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {metric.label}
                      </p>
                      <p className="text-2xl font-bold mt-1">{metric.value}</p>
                      <p className="text-sm text-green-600 mt-1">
                        {metric.change}
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded-full ${
                        isDark ? "bg-slate-700" : "bg-gray-100"
                      }`}
                    >
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="xl:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>
                Track your key metrics over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="engagement" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="engagement">Engagement</TabsTrigger>
                  <TabsTrigger value="clicks">Clicks</TabsTrigger>
                  <TabsTrigger value="conversions">Conversions</TabsTrigger>
                </TabsList>

                <TabsContent value="engagement">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="engagement"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="clicks">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="clicks" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="conversions">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="conversions"
                        stroke="#F59E0B"
                        strokeWidth={3}
                        dot={{ fill: "#F59E0B", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Traffic Sources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>
                Where your visitors are coming from
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={channelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>

                <div className="space-y-2">
                  {channelData.map((channel, index) => (
                    <motion.div
                      key={channel.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 * index }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: channel.color }}
                        />
                        <span className="text-sm">{channel.name}</span>
                      </div>
                      <span className="text-sm font-medium">
                        {channel.value}%
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Analytics Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Detailed Analytics</CardTitle>
            <CardDescription>
              Comprehensive breakdown of your marketing performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Month</th>
                    <th className="text-left p-3 font-medium">
                      Engagement Rate
                    </th>
                    <th className="text-left p-3 font-medium">Total Clicks</th>
                    <th className="text-left p-3 font-medium">Impressions</th>
                    <th className="text-left p-3 font-medium">Conversions</th>
                    <th className="text-left p-3 font-medium">CVR</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.map((data, index) => (
                    <motion.tr
                      key={data.month}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="border-b hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3 font-medium">{data.month} 2024</td>
                      <td className="p-3">{data.engagement}%</td>
                      <td className="p-3">{data.clicks.toLocaleString()}</td>
                      <td className="p-3">
                        {data.impressions.toLocaleString()}
                      </td>
                      <td className="p-3">{data.conversions}</td>
                      <td className="p-3">
                        {((data.conversions / data.clicks) * 100).toFixed(1)}%
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
