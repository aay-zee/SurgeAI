import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ThemeCardProps {
  themeName: string; // "performance", "cost", etc.
  frequency: number; // 45 mentions
  sentiment: number; // -0.75
  sources: string[]; // ["reddit", "google_play"]
  quotes: string[]; // [quote1, quote2, ...]
}

export function ThemeCard({
  themeName,
  frequency,
  sentiment,
  sources,
  quotes,
}: ThemeCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Get sentiment color
  const getSentimentColor = () => {
    if (sentiment <= -0.5) return "text-red-600 bg-red-100 dark:bg-red-950";
    if (sentiment <= 0) return "text-orange-600 bg-orange-100 dark:bg-orange-950";
    if (sentiment <= 0.5) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-950";
    return "text-green-600 bg-green-100 dark:bg-green-950";
  };

  // Format theme name (convert snake_case to Title Case)
  const formatThemeName = (name: string) => {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Get icon/color for sources
  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      reddit: "bg-orange-200 text-orange-900 dark:bg-orange-900",
      hacker_news: "bg-orange-200 text-orange-900 dark:bg-orange-900",
      product_hunt: "bg-pink-200 text-pink-900 dark:bg-pink-900",
      quora: "bg-red-200 text-red-900 dark:bg-red-900",
      google_play: "bg-green-200 text-green-900 dark:bg-green-900",
      stack_exchange: "bg-blue-200 text-blue-900 dark:bg-blue-900",
      twitter: "bg-blue-200 text-blue-900 dark:bg-blue-900",
    };
    return colors[platform] || "bg-gray-200 text-gray-900 dark:bg-gray-700";
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          {/* Theme Title */}
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">
              {formatThemeName(themeName)}
            </CardTitle>
            {/* Frequency Badge */}
            <Badge variant="outline" className="whitespace-nowrap">
              {frequency} mentions
            </Badge>
          </div>

          {/* Sentiment and Sources Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sentiment Score */}
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${getSentimentColor()}`}
            >
              Sentiment: {sentiment.toFixed(2)}
            </div>

            {/* Source Badges */}
            <div className="flex gap-1 flex-wrap">
              {sources.map((source) => (
                <Badge
                  key={source}
                  variant="secondary"
                  className={`text-xs ${getPlatformColor(source)}`}
                >
                  {source
                    .split("_")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Expand/Collapse Button and Quotes Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {quotes.length} representative quote{quotes.length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-6 w-6 p-0"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Expandable Quotes Section */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2 pt-2 border-t"
            >
              {quotes.length > 0 ? (
                quotes.map((quote, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-muted/50 rounded p-3 text-sm"
                  >
                    <p className="text-foreground italic">"{quote}"</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      — From {sources.join(", ")}
                    </p>
                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No quotes available
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
