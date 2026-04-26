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

/** Normalise strengths/weaknesses to a plain string array regardless of source format. */
function toStringArray(items: any): string[] {
  if (!items) return [];
  if (Array.isArray(items)) return items.map(String);
  if (typeof items === "object") return Object.keys(items);
  return [];
}

export function CompetitorCard({
  appName,
  developer,
  rating,
  weaknesses,
  strengths,
  gaps,
  user_sentiment,
  top_positive_quote,
  top_negative_quote,
}: CompetitorCardProps) {
  const [expandedWeaknesses, setExpandedWeaknesses] = useState(false);
  const [expandedStrengths, setExpandedStrengths] = useState(false);

  const weaknessItems = toStringArray(weaknesses);
  const strengthItems = toStringArray(strengths);
  const gapItems = gaps ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden">
        {/* Header */}
        <CardHeader className="pb-4">
          <div className="space-y-3">
            <div>
              <CardTitle className="text-lg">{appName}</CardTitle>
              {developer && (
                <p className="text-sm text-muted-foreground">by {developer}</p>
              )}
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Star rating */}
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(rating ?? 0)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted"
                    }`}
                  />
                ))}
                <span className="text-sm font-medium ml-1">
                  {(rating ?? 0).toFixed(1)}
                </span>
              </div>
            </div>

            {/* User sentiment summary */}
            {user_sentiment && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                {user_sentiment}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Weaknesses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-red-700 dark:text-red-400 text-sm">
                Weaknesses ({weaknessItems.length})
              </h4>
              {weaknessItems.length > 0 && (
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
              )}
            </div>

            {/* Top negative quote always visible */}
            {top_negative_quote && (
              <p className="text-xs text-red-600 dark:text-red-400 italic line-clamp-2">
                "{top_negative_quote}"
              </p>
            )}

            <AnimatePresence>
              {expandedWeaknesses && weaknessItems.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1"
                >
                  {weaknessItems.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-muted-foreground flex gap-2 items-start bg-red-50 dark:bg-red-950/20 rounded px-2 py-1"
                    >
                      <span className="text-red-500 shrink-0">✗</span>
                      {item}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>

            {weaknessItems.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No weaknesses identified
              </p>
            )}
          </div>

          <div className="border-t" />

          {/* Strengths */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-green-700 dark:text-green-400 text-sm">
                Strengths ({strengthItems.length})
              </h4>
              {strengthItems.length > 0 && (
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
              )}
            </div>

            {/* Top positive quote always visible */}
            {top_positive_quote && (
              <p className="text-xs text-green-600 dark:text-green-400 italic line-clamp-2">
                "{top_positive_quote}"
              </p>
            )}

            <AnimatePresence>
              {expandedStrengths && strengthItems.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1"
                >
                  {strengthItems.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-muted-foreground flex gap-2 items-start bg-green-50 dark:bg-green-950/20 rounded px-2 py-1"
                    >
                      <span className="text-green-500 shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>

            {strengthItems.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No strengths identified
              </p>
            )}
          </div>

          {/* Market Gaps */}
          {gapItems.length > 0 && (
            <>
              <div className="border-t" />
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700 dark:text-blue-400 text-sm">
                  Market Gaps ({gapItems.length})
                </h4>
                <ul className="space-y-1">
                  {gapItems.map((gap, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-muted-foreground flex gap-2 items-start bg-blue-50 dark:bg-blue-950/20 rounded px-2 py-1"
                    >
                      <span className="text-blue-500 shrink-0">→</span>
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
