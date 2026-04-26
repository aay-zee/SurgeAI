import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "motion/react";

interface ValidationScoreCardProps {
  title: string; // "Market Size", "Demand", etc.
  score: number; // 1-10
  reason: string; // Explanation
  icon?: React.ReactNode;
}

export function ValidationScoreCard({
  title,
  score,
  reason,
  icon,
}: ValidationScoreCardProps) {
  // Get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 7) return "text-green-600";
    if (score >= 4) return "text-amber-600";
    return "text-red-600";
  };

  // Get background color for progress bar
  const getProgressColor = (score: number) => {
    if (score >= 7) return "bg-green-500";
    if (score >= 4) return "bg-amber-500";
    return "bg-red-500";
  };

  // Get badge background
  const getBadgeBackground = (score: number) => {
    if (score >= 7) return "bg-green-100 dark:bg-green-950";
    if (score >= 4) return "bg-amber-100 dark:bg-amber-950";
    return "bg-red-100 dark:bg-red-950";
  };

  const percentage = (score / 10) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            {icon && <div className="text-xl">{icon}</div>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Display */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
                {score}
              </div>
              <div className="text-sm text-muted-foreground">/10</div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${getProgressColor(score)}`}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Score Interpretation Badge */}
          <div
            className={`inline-block px-2 py-1 rounded text-xs font-medium ${getBadgeBackground(score)}`}
          >
            {score >= 7 && "Strong"}
            {score >= 4 && score < 7 && "Moderate"}
            {score < 4 && "Weak"}
          </div>

          {/* Reason Text */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {reason}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
