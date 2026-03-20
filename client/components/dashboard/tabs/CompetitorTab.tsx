"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CompetitorCard } from "@/components/cards/CompetitorCard";
import { CompetitorAnalysis } from "@/types/campaign";
import { motion } from "motion/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface CompetitorTabProps {
  competitors: CompetitorAnalysis;
  onExtract: () => Promise<void>;
}

type SortKey = "rating" | "reviews" | "name";

export function CompetitorTab({ competitors, onExtract }: CompetitorTabProps) {
  const [extracting, setExtracting] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("rating");

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

  // Sort competitors based on selection
  const sortedCompetitors = React.useMemo(() => {
    const entries = Object.entries(competitors);

    if (sortBy === "rating") {
      return entries.sort((a, b) => b[1].rating - a[1].rating);
    } else if (sortBy === "reviews") {
      return entries.sort((a, b) => b[1].review_count - a[1].review_count);
    } else {
      return entries.sort((a, b) => a[0].localeCompare(b[0]));
    }
  }, [competitors, sortBy]);

  const hasCompetitors = Object.keys(competitors).length > 0;

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
          <h2 className="text-2xl font-bold">Competitor Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze competitor app reviews to identify gaps and opportunities
          </p>
        </div>
        <Button onClick={handleExtract} disabled={extracting}>
          {extracting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {extracting ? "Analyzing..." : "Extract Analysis"}
        </Button>
      </motion.div>

      {/* Info Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-green-50 dark:bg-green-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Why Analyze Competitors?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              By analyzing competitor reviews, you can identify their weaknesses and
              customers' unmet needs. This reveals gaps in the market that your solution
              can fill.
            </p>
            <p className="text-muted-foreground">
              💡 Look for common complaints in competitor apps - these are opportunities
              for differentiation.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {hasCompetitors ? (
        <>
          {/* Sort Controls */}
          <motion.div variants={itemVariants} className="flex gap-2 items-center">
            <span className="text-sm font-medium">Sort by:</span>
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortKey)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Rating (Highest First)</SelectItem>
                <SelectItem value="reviews">Reviews (Most First)</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* Competitor Cards */}
          <motion.div
            variants={containerVariants}
            className="grid gap-4 lg:grid-cols-2"
          >
            {sortedCompetitors.map(([appName, appData]) => (
              <motion.div key={appName} variants={itemVariants}>
                <CompetitorCard appName={appName} {...appData} />
              </motion.div>
            ))}
          </motion.div>

          {/* Competitor Insights */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Competitive Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  // Find most complained issue across all competitors
                  const allWeaknesses: Record<string, number> = {};
                  Object.values(competitors).forEach((app) => {
                    Object.entries(app.weaknesses || {}).forEach(
                      ([theme, data]) => {
                        allWeaknesses[theme] = (allWeaknesses[theme] || 0) + data.frequency;
                      }
                    );
                  });

                  const mostCommonWeakness = Object.entries(allWeaknesses).sort(
                    (a, b) => b[1] - a[1]
                  )[0];

                  // Find most praised features across all competitors
                  const allStrengths: Record<string, number> = {};
                  Object.values(competitors).forEach((app) => {
                    Object.entries(app.strengths || {}).forEach(
                      ([theme, data]) => {
                        allStrengths[theme] = (allStrengths[theme] || 0) + data.frequency;
                      }
                    );
                  });

                  const mostCommonStrength = Object.entries(allStrengths).sort(
                    (a, b) => b[1] - a[1]
                  )[0];

                  const avgRating =
                    Object.values(competitors).reduce((sum, app) => sum + app.rating, 0) /
                    Object.keys(competitors).length;

                  return (
                    <>
                      <div className="flex gap-2">
                        <span>📊</span>
                        <div>
                          <p className="font-medium">Average Rating</p>
                          <p className="text-muted-foreground">
                            {avgRating.toFixed(1)} / 5.0 stars across {Object.keys(competitors).length}{" "}
                            competitors
                          </p>
                        </div>
                      </div>

                      {mostCommonWeakness && (
                        <div className="flex gap-2">
                          <span>🎯</span>
                          <div>
                            <p className="font-medium">Most Common Weakness</p>
                            <p className="text-muted-foreground">
                              "{mostCommonWeakness[0]}" is the most complained about issue
                              across competitors
                            </p>
                          </div>
                        </div>
                      )}

                      {mostCommonStrength && (
                        <div className="flex gap-2">
                          <span>⭐</span>
                          <div>
                            <p className="font-medium">Most Praised Feature</p>
                            <p className="text-muted-foreground">
                              "{mostCommonStrength[0]}" is praised consistently by users
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <span>💡</span>
                        <div>
                          <p className="font-medium">Opportunity</p>
                          <p className="text-muted-foreground">
                            Build your solution to excel at what competitors struggle with,
                            while matching their strengths.
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </motion.div>

          {/* Competitor Comparison Summary */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What This Data Shows</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  ✓ <strong>Weaknesses:</strong> Extracted from low-rated reviews (1-2 stars),
                  showing what customers dislike
                </p>
                <p>
                  ✓ <strong>Strengths:</strong> Extracted from high-rated reviews (4-5 stars),
                  showing what customers love
                </p>
                <p>
                  ✓ <strong>Frequency:</strong> How many times each issue is mentioned,
                  indicating severity
                </p>
                <p>
                  ✓ <strong>Quotes:</strong> Real customer feedback showing exact pain points
                  and satisfaction drivers
                </p>
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
                  <h3 className="font-semibold text-lg">No Competitor Data Yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Competitor analysis requires Google Play app reviews. Make sure the Google
                    Play scraper has completed.
                  </p>
                </div>
                <Button onClick={handleExtract} disabled={extracting}>
                  {extracting ? "Analyzing..." : "Analyze Competitors Now"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* How It Works */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How Competitor Analysis Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <span className="font-bold text-green-600">1</span>
                  <div>
                    <p className="font-medium">Scrape Google Play</p>
                    <p className="text-muted-foreground">
                      Collect reviews for competitor apps in your market
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="font-bold text-green-600">2</span>
                  <div>
                    <p className="font-medium">Separate by Rating</p>
                    <p className="text-muted-foreground">
                      Group reviews into low-rated (1-2 stars) and high-rated (4-5 stars)
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="font-bold text-green-600">3</span>
                  <div>
                    <p className="font-medium">Extract Themes</p>
                    <p className="text-muted-foreground">
                      Identify common weaknesses and strengths from reviews
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="font-bold text-green-600">4</span>
                  <div>
                    <p className="font-medium">Display Insights</p>
                    <p className="text-muted-foreground">
                      Show gaps you can fill and features to match or exceed
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
