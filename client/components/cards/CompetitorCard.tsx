import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CompetitorApp } from "@/types/campaign";

interface CompetitorCardProps extends CompetitorApp {
  appName: string;
}

export function CompetitorCard({
  appName,
  developer,
  rating,
  review_count,
  weaknesses,
  strengths,
}: CompetitorCardProps) {
  const [expandedWeaknesses, setExpandedWeaknesses] = useState(false);
  const [expandedStrengths, setExpandedStrengths] = useState(false);

  const weaknessThemeCount = Object.keys(weaknesses || {}).length;
  const strengthThemeCount = Object.keys(strengths || {}).length;

  // Format theme name
  const formatThemeName = (name: string) => {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Get sentiment color
  const getSentimentColor = (sentiment: number) => {
    if (sentiment <= -0.5) return "text-red-600 bg-red-100 dark:bg-red-950";
    if (sentiment <= 0) return "text-orange-600 bg-orange-100 dark:bg-orange-950";
    if (sentiment <= 0.5) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-950";
    return "text-green-600 bg-green-100 dark:bg-green-950";
  };

  const renderThemesList = (themes: Record<string, any>, isWeakness: boolean) => {
    if (!themes || Object.keys(themes).length === 0) {
      return (
        <p className="text-sm text-muted-foreground italic">
          No {isWeakness ? "weaknesses" : "strengths"} identified
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {Object.entries(themes).map(([themeName, themeData]) => (
          <div
            key={themeName}
            className={`rounded-lg p-3 ${
              isWeakness
                ? "bg-red-50 dark:bg-red-950/20"
                : "bg-green-50 dark:bg-green-950/20"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-sm font-medium">
                  {formatThemeName(themeName)}
                </h5>
                <Badge variant="outline" className="text-xs">
                  {themeData.frequency}x
                </Badge>
              </div>

              {/* Sentiment indicator for weakness */}
              {isWeakness && themeData.sentiment && (
                <div
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getSentimentColor(
                    themeData.sentiment
                  )}`}
                >
                  Sentiment: {themeData.sentiment.toFixed(2)}
                </div>
              )}

              {/* Sample quotes */}
              {themeData.quotes && themeData.quotes.length > 0 && (
                <div className="space-y-1">
                  {themeData.quotes.slice(0, 2).map((quote: string, idx: number) => (
                    <p
                      key={idx}
                      className="text-xs text-muted-foreground italic line-clamp-2"
                    >
                      "{quote}"
                    </p>
                  ))}
                  {themeData.quotes.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{themeData.quotes.length - 2} more quote
                      {themeData.quotes.length - 2 > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden">
        {/* Header with App Info */}
        <CardHeader className="pb-4">
          <div className="space-y-3">
            {/* App Name and Developer */}
            <div>
              <CardTitle className="text-lg">{appName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                by {developer || "Unknown Developer"}
              </p>
            </div>

            {/* Rating and Review Count */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : i < rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{rating.toFixed(1)}</span>
              </div>

              <Badge variant="secondary">
                {review_count} reviews analyzed
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Weaknesses Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-red-700 dark:text-red-400">
                Weaknesses ({weaknessThemeCount})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedWeaknesses(!expandedWeaknesses)}
                className="h-6 w-6 p-0"
              >
                {expandedWeaknesses ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            <AnimatePresence>
              {expandedWeaknesses && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderThemesList(weaknesses, true)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Strengths Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-green-700 dark:text-green-400">
                Strengths ({strengthThemeCount})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedStrengths(!expandedStrengths)}
                className="h-6 w-6 p-0"
              >
                {expandedStrengths ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            <AnimatePresence>
              {expandedStrengths && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderThemesList(strengths, false)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
