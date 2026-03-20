"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeCard } from "@/components/cards/ThemeCard";
import { Themes } from "@/types/campaign";
import { motion } from "motion/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ThemesTabProps {
  themes: Themes;
  onExtract: () => Promise<void>;
}

type SortKey = "frequency" | "sentiment" | "alphabetical";

export function ThemesTab({ themes, onExtract }: ThemesTabProps) {
  const [extracting, setExtracting] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("frequency");

  const handleExtract = async () => {
    setExtracting(true);
    try {
      await onExtract();
    } finally {
      setExtracting(false);
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

  // Sort themes based on selection
  const sortedThemes = React.useMemo(() => {
    const entries = Object.entries(themes);

    if (sortBy === "frequency") {
      return entries.sort((a, b) => b[1].frequency - a[1].frequency);
    } else if (sortBy === "sentiment") {
      return entries.sort((a, b) => a[1].sentiment - b[1].sentiment); // Most negative first
    } else {
      return entries.sort((a, b) => a[0].localeCompare(b[0]));
    }
  }, [themes, sortBy]);

  const hasThemes = Object.keys(themes).length > 0;

  // Theme color indicators
  const getThemeIcon = (themeName: string) => {
    const icons: Record<string, string> = {
      performance: "⚡",
      user_interface: "🎨",
      learning_curve: "📚",
      integration: "🔗",
      cost: "💰",
      features: "✨",
      bugs: "🐛",
      customer_support: "👥",
    };
    return icons[themeName] || "📌";
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header with Extract Button */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between gap-4"
      >
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Themes & Pain Points</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Common themes extracted from negative customer feedback
          </p>
        </div>
        <Button onClick={handleExtract} disabled={extracting}>
          {extracting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {extracting ? "Extracting..." : "Extract Themes"}
        </Button>
      </motion.div>

      {/* Info Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">What Are Themes?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Themes are patterns extracted from negative customer feedback across all
              platforms. They reveal the most common complaints and pain points your target
              customers experience.
            </p>
            <p className="text-muted-foreground">
              💡 Use these insights to understand what problems your solution should
              solve and how to position it against competitors.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {hasThemes ? (
        <>
          {/* Sort Controls */}
          <motion.div variants={itemVariants} className="flex gap-2 items-center">
            <span className="text-sm font-medium">Sort by:</span>
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortKey)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="frequency">Frequency (Most Mentioned)</SelectItem>
                <SelectItem value="sentiment">Sentiment (Most Negative)</SelectItem>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* Theme Cards Grid */}
          <motion.div
            variants={containerVariants}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            {sortedThemes.map(([themeName, themeData]) => (
              <motion.div key={themeName} variants={itemVariants}>
                <ThemeCard
                  themeName={themeName}
                  frequency={themeData.frequency}
                  sentiment={themeData.sentiment}
                  sources={themeData.sources}
                  quotes={themeData.quotes}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Theme Statistics */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Theme Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Themes</p>
                    <p className="text-3xl font-bold">{Object.keys(themes).length}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Most Mentioned
                    </p>
                    <p className="text-3xl font-bold">
                      {Math.max(
                        ...Object.values(themes).map((t) => t.frequency)
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {
                        Object.entries(themes).sort(
                          (a, b) => b[1].frequency - a[1].frequency
                        )[0][0]
                      }
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Average Sentiment
                    </p>
                    <p className="text-3xl font-bold">
                      {(
                        Object.values(themes).reduce(
                          (sum, t) => sum + t.sentiment,
                          0
                        ) / Object.keys(themes).length
                      ).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Across all themes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Theme Insights */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {(() => {
                  const mostMentioned = Object.entries(themes).sort(
                    (a, b) => b[1].frequency - a[1].frequency
                  )[0];
                  const mostNegative = Object.entries(themes).sort(
                    (a, b) => a[1].sentiment - b[1].sentiment
                  )[0];

                  return (
                    <>
                      <div className="flex gap-2">
                        <span>🔥</span>
                        <div>
                          <p className="font-medium">Most Mentioned Pain Point</p>
                          <p className="text-muted-foreground">
                            "{mostMentioned[0]}" appears {mostMentioned[1].frequency} times
                            across sources
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <span>😢</span>
                        <div>
                          <p className="font-medium">Most Severe Complaint</p>
                          <p className="text-muted-foreground">
                            "{mostNegative[0]}" has sentiment of{" "}
                            {mostNegative[1].sentiment.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <span>💡</span>
                        <div>
                          <p className="font-medium">How to Use This</p>
                          <p className="text-muted-foreground">
                            Design your solution to address these pain points first.
                            Focus on the most mentioned and most negative themes.
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </motion.div>
        </>
      ) : (
        <>
          {/* Empty State */}
          <motion.div variants={itemVariants}>
            <Card className="bg-muted/50">
              <CardContent className="py-12 text-center space-y-4">
                <div className="text-5xl">🔍</div>
                <div>
                  <h3 className="font-semibold text-lg">No Themes Extracted Yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Themes are extracted from negative customer feedback. Make sure scrapers
                    have completed and NLP analysis has run.
                  </p>
                </div>
                <Button onClick={handleExtract} disabled={extracting}>
                  {extracting ? "Extracting..." : "Extract Themes Now"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* How It Works */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How Theme Extraction Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <span className="font-bold text-blue-600">1</span>
                  <div>
                    <p className="font-medium">Collect Feedback</p>
                    <p className="text-muted-foreground">
                      Scrapers collect posts from Reddit, Quora, Google Play, etc.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="font-bold text-blue-600">2</span>
                  <div>
                    <p className="font-medium">Analyze Sentiment</p>
                    <p className="text-muted-foreground">
                      DistilBERT identifies negative feedback (-1.0 to 1.0)
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="font-bold text-blue-600">3</span>
                  <div>
                    <p className="font-medium">Extract Themes</p>
                    <p className="text-muted-foreground">
                      Negative posts are grouped into common themes (performance, cost, UI,
                      etc.)
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="font-bold text-blue-600">4</span>
                  <div>
                    <p className="font-medium">Select Quotes</p>
                    <p className="text-muted-foreground">
                      Best representative quotes are displayed showing real customer complaints
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
