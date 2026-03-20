import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import { ConfidenceScore } from "@/types/campaign";
import { WarningBanner } from "@/components/ui/WarningBanner";

interface ConfidenceWidgetProps {
  confidence: ConfidenceScore;
}

export function ConfidenceWidget({ confidence }: ConfidenceWidgetProps) {
  // Get color based on confidence score
  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-900 dark:bg-green-950";
    if (score >= 60) return "bg-amber-100 text-amber-900 dark:bg-amber-950";
    if (score >= 40) return "bg-orange-100 text-orange-900 dark:bg-orange-950";
    return "bg-red-100 text-red-900 dark:bg-red-950";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-amber-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getInterpretation = (score: number) => {
    if (score >= 80) return "Excellent data quality";
    if (score >= 60) return "Good data quality";
    if (score >= 40) return "Moderate data quality";
    return "Low data quality - collect more data";
  };

  const factorLabels: Record<string, string> = {
    data_volume: "Data Volume",
    data_diversity: "Data Diversity",
    analysis_coverage: "Analysis Coverage",
    data_freshness: "Data Freshness",
    threshold_compliance: "Threshold Compliance",
  };

  return (
    <div className="space-y-6">
      {/* Main Confidence Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Data Quality Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Large Confidence Display */}
            <div className="space-y-4">
              <div className="flex items-baseline gap-3">
                <div
                  className={`text-6xl font-bold ${getConfidenceColor(
                    confidence.confidence_score
                  )}`}
                >
                  {confidence.confidence_score}
                </div>
                <div className="text-2xl text-muted-foreground">%</div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress
                  value={confidence.confidence_score}
                  className="h-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low (0%)</span>
                  <span>High (100%)</span>
                </div>
              </div>

              {/* Interpretation Badge */}
              <div className="flex items-center gap-2">
                <Badge className={getConfidenceBadge(confidence.confidence_score)}>
                  {getInterpretation(confidence.confidence_score)}
                </Badge>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* 5 Factor Breakdown */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Factor Breakdown</h4>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {Object.entries(confidence.factors || {}).map(([key, factor]) => {
                  const factorLabel = factorLabels[key] || key;
                  const isGood = factor.score >= 75;
                  const isModerate = factor.score >= 50 && factor.score < 75;

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {factorLabel}
                        </p>
                        <div className="text-2xl font-bold">
                          {factor.score}
                          <span className="text-sm text-muted-foreground">/100</span>
                        </div>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isGood
                              ? "bg-green-500"
                              : isModerate
                                ? "bg-amber-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${factor.score}%` }}
                        />
                      </div>

                      {/* Factor Reason (Truncated) */}
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {factor.reason}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Warnings Section */}
      {confidence.warnings && confidence.warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <WarningBanner
            warnings={confidence.warnings}
            severity="warning"
            dismissible={true}
          />
        </motion.div>
      )}
    </div>
  );
}
