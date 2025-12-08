import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Star,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const keywordsData = [
  {
    id: 1,
    keyword: "AI marketing automation",
    volume: 45200,
    difficulty: 72,
    cpc: 4.25,
    trend: "up",
    change: 12.5,
    position: 3,
    clicks: 1250,
    impressions: 18500,
    ctr: 6.8,
  },
  {
    id: 2,
    keyword: "machine learning analytics",
    volume: 33100,
    difficulty: 68,
    cpc: 3.85,
    trend: "up",
    change: 8.2,
    position: 5,
    clicks: 890,
    impressions: 15200,
    ctr: 5.9,
  },
  {
    id: 3,
    keyword: "predictive customer behavior",
    volume: 22800,
    difficulty: 75,
    cpc: 5.1,
    trend: "down",
    change: -3.1,
    position: 8,
    clicks: 650,
    impressions: 12100,
    ctr: 5.4,
  },
  {
    id: 4,
    keyword: "sentiment analysis tools",
    volume: 18500,
    difficulty: 61,
    cpc: 2.95,
    trend: "up",
    change: 15.7,
    position: 2,
    clicks: 1420,
    impressions: 20300,
    ctr: 7.0,
  },
  {
    id: 5,
    keyword: "automated content optimization",
    volume: 16200,
    difficulty: 58,
    cpc: 3.4,
    trend: "up",
    change: 22.3,
    position: 4,
    clicks: 980,
    impressions: 14800,
    ctr: 6.6,
  },
];

export function KeywordsContent() {
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const filteredKeywords = keywordsData.filter((keyword) =>
    keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
          Keywords Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Track and optimize your keyword performance with AI-powered insights.
        </p>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Star className="w-4 h-4 mr-2" />
          Add to Favorites
        </Button>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            {[
              {
                label: "Total Keywords",
                value: "1,247",
                change: "+89 this month",
              },
              {
                label: "Avg. Position",
                value: "4.2",
                change: "Improved by 1.3",
              },
              {
                label: "Total Clicks",
                value: "24.5K",
                change: "+15.2% vs last month",
              },
              {
                label: "Click-through Rate",
                value: "6.4%",
                change: "+0.8% improvement",
              },
            ].map((metric, index) => (
              <Card key={metric.label}>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {metric.label}
                  </p>
                  <p className="text-2xl font-bold mt-1">{metric.value}</p>
                  <p className="text-xs text-green-600 mt-1">{metric.change}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Keywords Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Keyword Performance</CardTitle>
                <CardDescription>
                  Track your keyword rankings and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Keyword</th>
                        <th className="text-left p-3 font-medium">Volume</th>
                        <th className="text-left p-3 font-medium">Position</th>
                        <th className="text-left p-3 font-medium">Clicks</th>
                        <th className="text-left p-3 font-medium">CTR</th>
                        <th className="text-left p-3 font-medium">Trend</th>
                        <th className="text-left p-3 font-medium">CPC</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKeywords.map((keyword, index) => (
                        <motion.tr
                          key={keyword.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="border-b hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="p-3">
                            <div className="font-medium">{keyword.keyword}</div>
                            <div className="text-sm text-gray-500">
                              Difficulty: {keyword.difficulty}%
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-medium">
                              {keyword.volume.toLocaleString()}
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                keyword.position <= 3 ? "default" : "secondary"
                              }
                            >
                              #{keyword.position}
                            </Badge>
                          </td>
                          <td className="p-3">{keyword.clicks}</td>
                          <td className="p-3">{keyword.ctr}%</td>
                          <td className="p-3">
                            <div className="flex items-center">
                              {keyword.trend === "up" ? (
                                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                              )}
                              <span
                                className={`text-sm ${
                                  keyword.trend === "up"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {keyword.change > 0 ? "+" : ""}
                                {keyword.change}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3">${keyword.cpc}</td>
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="opportunities">
          <Card>
            <CardHeader>
              <CardTitle>Keyword Opportunities</CardTitle>
              <CardDescription>
                AI-discovered opportunities to improve your keyword strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: "Long-tail Opportunity",
                    description:
                      'Target "AI marketing automation for small business" - 15K monthly searches, low competition',
                    potential: "High",
                    effort: "Low",
                  },
                  {
                    title: "Semantic Expansion",
                    description:
                      'Add "intelligent marketing tools" to capture related searches',
                    potential: "Medium",
                    effort: "Medium",
                  },
                  {
                    title: "Local Optimization",
                    description:
                      "Optimize for location-based keywords in your target markets",
                    potential: "High",
                    effort: "High",
                  },
                ].map((opportunity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium">{opportunity.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {opportunity.description}
                        </p>
                        <div className="flex space-x-2 mt-2">
                          <Badge variant="outline">
                            Potential: {opportunity.potential}
                          </Badge>
                          <Badge variant="outline">
                            Effort: {opportunity.effort}
                          </Badge>
                        </div>
                      </div>
                      <Button size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Explore
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking">
          <Card>
            <CardHeader>
              <CardTitle>Keyword Tracking</CardTitle>
              <CardDescription>
                Monitor your keyword positions and performance over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Advanced Tracking Coming Soon
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Historical tracking and competitive analysis features are in
                  development.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
