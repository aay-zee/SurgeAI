"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RawDataTable } from "@/components/tables/RawDataTable";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface RawDataTabProps {
  data: {
    reddit?: any[];
    hacker_news?: any[];
    product_hunt?: any[];
    quora?: any[];
    google_play?: any[];
    stack_exchange?: any[];
  };
  onRefresh: () => Promise<void>;
}

type PlatformKey = "reddit" | "hacker_news" | "product_hunt" | "quora" | "google_play" | "stack_exchange";

const PLATFORM_CONFIG: Record<PlatformKey, { label: string; icon: string }> = {
  reddit: { label: "Reddit", icon: "🔴" },
  hacker_news: { label: "Hacker News", icon: "⬛" },
  product_hunt: { label: "Product Hunt", icon: "🦊" },
  quora: { label: "Quora", icon: "❓" },
  google_play: { label: "Google Play", icon: "▶️" },
  stack_exchange: { label: "Stack Exchange", icon: "🔻" },
};

export function RawDataTab({ data, onRefresh }: RawDataTabProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey>("reddit");

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  // Get available platforms from data
  const availablePlatforms = (Object.keys(data) as PlatformKey[])
    .filter((key) => data[key] && data[key].length > 0)
    .sort();

  // Set initial platform to first available
  const activePlatform = availablePlatforms.includes(selectedPlatform)
    ? selectedPlatform
    : availablePlatforms[0];

  const currentData = activePlatform ? data[activePlatform] || [] : [];

  // Column configurations per platform
  const getColumnsForPlatform = (platform: PlatformKey) => {
    switch (platform) {
      case "reddit":
        return [
          { key: "title", label: "Title", sortable: true },
          { key: "score", label: "Score", sortable: true },
          { key: "num_comments", label: "Comments", sortable: true },
          { key: "sentiment", label: "Sentiment", sortable: true },
          { key: "created_at", label: "Posted", sortable: true },
        ];

      case "hacker_news":
        return [
          { key: "title", label: "Title", sortable: true },
          { key: "score", label: "Points", sortable: true },
          { key: "num_comments", label: "Comments", sortable: true },
          { key: "sentiment", label: "Sentiment", sortable: true },
          { key: "created_at", label: "Posted", sortable: true },
        ];

      case "product_hunt":
        return [
          { key: "name", label: "Product Name", sortable: true },
          { key: "tagline", label: "Tagline", sortable: false },
          { key: "upvotes", label: "Upvotes", sortable: true },
          { key: "sentiment", label: "Sentiment", sortable: true },
          { key: "created_at", label: "Launched", sortable: true },
        ];

      case "quora":
        return [
          { key: "question", label: "Question", sortable: true },
          { key: "answer_count", label: "Answers", sortable: true },
          { key: "views", label: "Views", sortable: true },
          { key: "sentiment", label: "Sentiment", sortable: true },
          { key: "created_at", label: "Asked", sortable: true },
        ];

      case "google_play":
        return [
          { key: "app_name", label: "App Name", sortable: true },
          { key: "rating", label: "Rating", sortable: true },
          { key: "review_text", label: "Review", sortable: true },
          { key: "sentiment", label: "Sentiment", sortable: true },
          { key: "review_date", label: "Date", sortable: true },
        ];

      case "stack_exchange":
        return [
          { key: "title", label: "Question", sortable: true },
          { key: "score", label: "Score", sortable: true },
          { key: "answer_count", label: "Answers", sortable: true },
          { key: "view_count", label: "Views", sortable: true },
          { key: "sentiment", label: "Sentiment", sortable: true },
          { key: "created_at", label: "Asked", sortable: true },
        ];

      default:
        return [{ key: "id", label: "ID", sortable: false }];
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header with Refresh Button */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between gap-4"
      >
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Raw Data</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View all collected and analyzed data from each platform
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          {refreshing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </Button>
      </motion.div>

      {/* Info Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-slate-50 dark:bg-slate-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Raw Data Explained</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              This is all the data collected from different platforms. Each row represents one
              post, review, question, or article. The sentiment score shows whether the content is
              positive (closer to 1) or negative (closer to -1).
            </p>
            <p className="text-muted-foreground">
              💡 Use filters and search to find specific topics. Sort by sentiment to see strongest
              customer opinions.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Platform Selector */}
      {availablePlatforms.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Select Platform</CardTitle>
                  <CardDescription>Choose which platform data to view</CardDescription>
                </div>
                <Select value={activePlatform} onValueChange={(val) => setSelectedPlatform(val as PlatformKey)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlatforms.map((platform) => (
                      <SelectItem key={platform} value={platform}>
                        {PLATFORM_CONFIG[platform].icon} {PLATFORM_CONFIG[platform].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            {/* Platform Stats */}
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                {availablePlatforms.map((platform) => {
                  const platformData = data[platform] || [];
                  const positiveCount = platformData.filter(
                    (item) => item.sentiment && item.sentiment > 0
                  ).length;
                  const negativeCount = platformData.filter(
                    (item) => item.sentiment && item.sentiment < -0.1
                  ).length;

                  return (
                    <div
                      key={platform}
                      className={`p-3 rounded-lg border-2 transition cursor-pointer ${
                        activePlatform === platform
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                          : "border-muted hover:border-muted-foreground/30"
                      }`}
                      onClick={() => setSelectedPlatform(platform)}
                    >
                      <p className="text-sm font-medium mb-2">
                        {PLATFORM_CONFIG[platform].icon} {PLATFORM_CONFIG[platform].label}
                      </p>
                      <div className="space-y-1 text-xs">
                        <p className="text-muted-foreground">
                          {platformData.length} {platformData.length === 1 ? "item" : "items"}
                        </p>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-green-600">
                            +{positiveCount}
                          </Badge>
                          <Badge variant="outline" className="text-red-600">
                            -{negativeCount}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Data Table */}
      {availablePlatforms.length > 0 && currentData.length > 0 ? (
        <motion.div variants={itemVariants}>
          <RawDataTable
            data={currentData}
            columns={getColumnsForPlatform(activePlatform)}
            title={`${PLATFORM_CONFIG[activePlatform].label} Data`}
            searchable={true}
            sortable={true}
            pagination={true}
            rowsPerPage={20}
          />
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
          <Card className="bg-muted/50">
            <CardContent className="py-12 text-center space-y-4">
              <div className="text-5xl">📭</div>
              <div>
                <h3 className="font-semibold text-lg">No Data Available</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {availablePlatforms.length === 0
                    ? "No data has been collected yet. Run the scrapers to gather data from platforms."
                    : "No data found for this platform."}
                </p>
              </div>
              <Button onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? "Refreshing..." : "Refresh Data"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Data Statistics */}
      {availablePlatforms.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Collection Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {/* Total Data Points */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Data Points</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {availablePlatforms.reduce((sum, platform) => {
                      return sum + (data[platform]?.length || 0);
                    }, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Across all platforms</p>
                </div>

                {/* Platforms Covered */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Platforms Covered</p>
                  <p className="text-3xl font-bold text-green-600">{availablePlatforms.length}</p>
                  <p className="text-xs text-muted-foreground">
                    of 6 available platforms
                  </p>
                </div>

                {/* Sentiment Distribution */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Sentiment Ratio</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
                        {(() => {
                          const allData = availablePlatforms.reduce((acc, platform) => {
                            return acc.concat(data[platform] || []);
                          }, [] as any[]);

                          const positive = allData.filter(
                            (item) => item.sentiment && item.sentiment > 0
                          ).length;
                          const negative = allData.filter(
                            (item) => item.sentiment && item.sentiment < -0.1
                          ).length;
                          const total = allData.length;

                          const posPercent = total > 0 ? (positive / total) * 100 : 0;
                          const negPercent = total > 0 ? (negative / total) * 100 : 0;

                          return (
                            <>
                              {posPercent > 0 && (
                                <div
                                  className="bg-green-500"
                                  style={{ width: `${posPercent}%` }}
                                />
                              )}
                              {negPercent > 0 && (
                                <div
                                  className="bg-red-500"
                                  style={{ width: `${negPercent}%` }}
                                />
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const allData = availablePlatforms.reduce((acc, platform) => {
                        return acc.concat(data[platform] || []);
                      }, [] as any[]);
                      const positive = allData.filter(
                        (item) => item.sentiment && item.sentiment > 0
                      ).length;
                      const negative = allData.filter(
                        (item) => item.sentiment && item.sentiment < -0.1
                      ).length;

                      return `${positive} positive, ${negative} negative`;
                    })()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* How to Use This Data */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How to Use Raw Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="font-bold text-blue-600">1</span>
              <div>
                <p className="font-medium">Select a Platform</p>
                <p className="text-muted-foreground">
                  Choose which platform's data you want to explore
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-blue-600">2</span>
              <div>
                <p className="font-medium">Search & Filter</p>
                <p className="text-muted-foreground">
                  Use the search box to find specific keywords or topics
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-blue-600">3</span>
              <div>
                <p className="font-medium">Sort by Sentiment</p>
                <p className="text-muted-foreground">
                  Click "Sentiment" column to see most negative (strongest complaints) first
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-blue-600">4</span>
              <div>
                <p className="font-medium">Identify Patterns</p>
                <p className="text-muted-foreground">
                  Look for recurring themes across multiple posts and sources
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground pt-2">
              This raw data was analyzed and summarized into Themes and Competitor Analysis tabs.
              Use this view for detailed exploration and validation.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Quality Notes */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Understanding Sentiment Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">🟢 Positive (0.1 to 1.0)</p>
              <p>The post/review expresses satisfaction, praise, or positive sentiment.</p>
            </div>

            <div>
              <p className="font-medium text-foreground mb-1">🟡 Neutral (-0.1 to 0.1)</p>
              <p>The post/review is factual or neutral without clear positive/negative tone.</p>
            </div>

            <div>
              <p className="font-medium text-foreground mb-1">🔴 Negative (-1.0 to -0.1)</p>
              <p>The post/review expresses complaints, criticism, or negative sentiment.</p>
            </div>

            <div className="pt-3 border-t">
              <p className="font-medium text-foreground mb-2">💡 Key Points:</p>
              <ul className="space-y-1">
                <li>• Sentiment calculated by DistilBERT NLP model</li>
                <li>• Negative posts are most valuable for identifying pain points</li>
                <li>• Positive posts show what customers value and love</li>
                <li>• Neutral posts provide context but less actionable insight</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
