"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComprehensiveReport } from "@/types/campaign";
import { motion } from "motion/react";
import { BarChart3, TrendingUp, Database, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface OverviewTabProps {
  report: ComprehensiveReport;
  onRefresh: () => void;
}

export function OverviewTab({ report: rawReport, onRefresh }: OverviewTabProps) {
  // Safe defaults for potentially missing data
  const report = {
    ...rawReport,
    campaign: {
      ...rawReport.campaign,
      keywords: rawReport.campaign?.keywords || [],
      created_at: rawReport.campaign?.created_at || new Date().toISOString(),
    },
    validation_scores: {
      overall_score: 0,
      ...rawReport.validation_scores,
    },
    confidence: {
      confidence_score: 0,
      warnings: [],
      ...rawReport.confidence,
    },
    data_summary: {
      total_data_points: 0,
      ...rawReport.data_summary,
    },
    themes: rawReport.themes || {},
    market_signals: {
      monthly_search_volume: null,
      search_competition: null,
      estimated_cpc: null,
      trend_direction: null,
      ...rawReport.market_signals,
    },
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  // Get overall score color
  const getScoreColor = (score: number) => {
    if (score >= 7) return "text-green-600";
    if (score >= 4) return "text-amber-600";
    return "text-red-600";
  };

  // Get confidence color
  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const createdDate = format(new Date(report.campaign.created_at), "MMM d, yyyy");

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Campaign Info Card */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Campaign Information</CardTitle>
            <CardDescription>Basic details about this validation campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Campaign Name */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Campaign Name</p>
                <p className="text-lg font-semibold">{report.campaign.campaign_name}</p>
              </div>

              {/* Created Date */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-lg">{createdDate}</p>
              </div>

              {/* Description */}
              <div className="space-y-1 sm:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-base">{report.campaign.description || "No description provided"}</p>
              </div>

              {/* Keywords */}
              <div className="space-y-1 sm:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Keywords ({report.campaign.keywords.length})</p>
                <div className="flex gap-2 flex-wrap">
                  {report.campaign.keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Metrics Grid */}
      <motion.div variants={itemVariants}>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Overall Validation Score */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Validation Score</CardTitle>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className={`text-4xl font-bold ${getScoreColor(report.validation_scores.overall_score)}`}>
                {report.validation_scores.overall_score.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">/10 Overall Score</div>
              <div className="text-xs text-muted-foreground">
                {report.validation_scores.overall_score >= 7 && "Strong opportunity"}
                {report.validation_scores.overall_score >= 4 && report.validation_scores.overall_score < 7 && "Moderate opportunity"}
                {report.validation_scores.overall_score < 4 && "Weak opportunity"}
              </div>
            </CardContent>
          </Card>

          {/* Confidence Score */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Data Quality</CardTitle>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className={`text-4xl font-bold ${getConfidenceColor(report.confidence.confidence_score)}`}>
                {report.confidence.confidence_score}
              </div>
              <div className="text-sm text-muted-foreground">% Confidence</div>
              <div className="text-xs text-muted-foreground">
                {report.confidence.confidence_score >= 80 && "Excellent"}
                {report.confidence.confidence_score >= 60 && report.confidence.confidence_score < 80 && "Good"}
                {report.confidence.confidence_score < 60 && "Fair"}
              </div>
            </CardContent>
          </Card>

          {/* Total Data Points */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Data Collected</CardTitle>
                <Database className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-4xl font-bold text-blue-600">
                {report.data_summary.total_data_points.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Data Points</div>
              <div className="text-xs text-muted-foreground">
                From {Object.keys(report.data_summary).length - 1} platforms
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Sentiment Distribution */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Breakdown</CardTitle>
            <CardDescription>Analysis of positive, neutral, and negative feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Calculate sentiment from themes */}
              <div className="space-y-3">
                {Object.entries(report.themes).slice(0, 3).map(([themeName, themeData]) => {
                  const displayName = themeName
                    .split("_")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ");

                  const isSentimentNegative = themeData.sentiment <= -0.5;
                  const sentimentLabel = isSentimentNegative ? "Negative" : "Mixed";

                  return (
                    <div key={themeName} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{displayName}</span>
                      <div className="flex items-center gap-2">
                        <div
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            isSentimentNegative
                              ? "bg-red-100 text-red-900 dark:bg-red-950"
                              : "bg-orange-100 text-orange-900 dark:bg-orange-950"
                          }`}
                        >
                          {sentimentLabel}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {themeData.frequency} mentions
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {Object.keys(report.themes).length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{Object.keys(report.themes).length - 3} more themes available in Themes tab
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Market Signals Preview */}
      {report.market_signals.monthly_search_volume && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Market Signals Preview</CardTitle>
              <CardDescription>Quick overview of market opportunity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Search Volume */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Monthly Search Volume</p>
                  <p className="text-2xl font-bold">
                    {(report.market_signals.monthly_search_volume / 1000).toFixed(0)}K
                  </p>
                  {report.market_signals.monthly_search_volume > 100000 && (
                    <p className="text-xs text-green-600">Mass market opportunity</p>
                  )}
                  {report.market_signals.monthly_search_volume >= 10000 && report.market_signals.monthly_search_volume <= 100000 && (
                    <p className="text-xs text-amber-600">Niche but viable</p>
                  )}
                </div>

                {/* Competition */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Competition Level</p>
                  <p className="text-2xl font-bold">{report.market_signals.search_competition || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">
                    Market competition level assessment
                  </p>
                </div>

                {/* CPC */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Estimated CPC</p>
                  <p className="text-2xl font-bold">
                    ${report.market_signals.estimated_cpc?.toFixed(2) || "N/A"}
                  </p>
                  {report.market_signals.estimated_cpc && report.market_signals.estimated_cpc > 5 && (
                    <p className="text-xs text-green-600">Profitable market</p>
                  )}
                </div>

                {/* Trend */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Trend Direction</p>
                  <p className="text-2xl font-bold">
                    {report.market_signals.trend_direction === "rising" && "📈"}
                    {report.market_signals.trend_direction === "stable" && "→"}
                    {report.market_signals.trend_direction === "falling" && "📉"}
                    {" "}
                    {report.market_signals.trend_direction || "N/A"}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                View full market signals analysis in the Signals tab
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Data Quality Warnings */}
      {report.confidence.warnings && report.confidence.warnings.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-amber-900 dark:text-amber-100">
                  Data Quality Notes
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-amber-900 dark:text-amber-100">
                {report.confidence.warnings.map((warning, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span>•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div variants={itemVariants} className="flex gap-2 pt-4">
        <Button onClick={onRefresh} variant="outline">
          Refresh Data
        </Button>
      </motion.div>
    </motion.div>
  );
}
