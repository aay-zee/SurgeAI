"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfidenceScore } from "@/types/campaign";
import { motion } from "motion/react";
import { Loader2, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

interface ConfidenceTabProps {
  confidence: ConfidenceScore;
  onRecalculate: () => Promise<void>;
}

export function ConfidenceTab({ confidence, onRecalculate }: ConfidenceTabProps) {
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await onRecalculate();
    } finally {
      setRecalculating(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const score = confidence.confidence_score;
  const scoreColor =
    score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-600" : "text-red-600";
  const barColor =
    score >= 80 ? "bg-green-600" : score >= 60 ? "bg-amber-600" : "bg-red-600";

  const factorEntries = Object.entries(confidence.factors || {});

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Data Quality & Confidence</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Assessment of data completeness, diversity, and analysis reliability
          </p>
        </div>
        <Button onClick={handleRecalculate} disabled={recalculating}>
          {recalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {recalculating ? "Recalculating..." : "Recalculate"}
        </Button>
      </motion.div>

      {/* Info Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-purple-50 dark:bg-purple-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Why Data Quality Matters</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Confidence score reflects how trustworthy the validation analysis is. Higher
              confidence means more data was collected from diverse sources, increasing reliability
              of insights.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Score Display */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Overall Confidence Score</CardTitle>
            <CardDescription>Based on data volume, diversity, freshness, and coverage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className={`text-7xl font-bold leading-none ${scoreColor}`}>
                {score}
              </span>
              <span className="text-2xl text-muted-foreground">%</span>
              <span className={`text-lg font-semibold ${scoreColor}`}>
                {score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Fair"}
              </span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Warnings */}
      {confidence.warnings && confidence.warnings.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Data Quality Warnings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {confidence.warnings.map((warning, idx) => (
                <p key={idx} className="text-sm text-amber-800 dark:text-amber-200">
                  • {warning}
                </p>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Confidence Interpretation */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confidence Interpretation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {score >= 80 && (
              <div className="flex gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Excellent Data Quality
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-200 mt-1">
                    {score}% confidence — comprehensive data from multiple sources. Analysis findings
                    are highly reliable. You can confidently act on these insights.
                  </p>
                </div>
              </div>
            )}
            {score >= 60 && score < 80 && (
              <div className="flex gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    Good Data Quality
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-200 mt-1">
                    {score}% confidence — good data but some sources underrepresented. Findings are
                    generally reliable, consider additional validation in weak areas.
                  </p>
                </div>
              </div>
            )}
            {score < 60 && (
              <div className="flex gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-100">Fair Data Quality</p>
                  <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                    {score}% confidence — limited data or low diversity. Validate with direct
                    customer feedback before making major decisions.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Factor Breakdown */}
      {factorEntries.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Factor Breakdown</CardTitle>
              <CardDescription>Individual components of the confidence score</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {factorEntries.map(([factorName, factorData]) => {
                const factorScore = factorData.score ?? 0;
                const factorBarColor =
                  factorScore >= 80
                    ? "bg-green-600"
                    : factorScore >= 60
                      ? "bg-amber-600"
                      : "bg-red-600";
                const displayName = factorName
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <div key={factorName} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{displayName}</span>
                      <span className="text-sm font-bold text-blue-600">
                        {factorScore.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${factorBarColor}`}
                        style={{ width: `${Math.min(factorScore, 100)}%` }}
                      />
                    </div>
                    {factorData.reason && (
                      <p className="text-xs text-muted-foreground">{factorData.reason}</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* What Affects Score */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What Affects Your Confidence Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { icon: "📊", title: "Data Volume", desc: "How much data was collected. More data = more confidence in patterns." },
              { icon: "🌍", title: "Data Diversity", desc: "Data from multiple sources (Reddit, HN, Google Play). More sources = less bias." },
              { icon: "🔍", title: "Analysis Coverage", desc: "Percentage of collected data successfully analyzed with NLP." },
              { icon: "📅", title: "Data Freshness", desc: "How recent the data is. Recent data reflects current market conditions." },
              { icon: "✅", title: "Threshold Compliance", desc: "Whether all critical metrics meet minimum quality thresholds." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-2">
                <span>{icon}</span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Improving Score */}
      {score < 80 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Improving Your Confidence Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Ways to increase confidence:
                  </p>
                  <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-200">
                    <li>• Run scrapers again to collect more data</li>
                    <li>• Ensure both Reddit and Hacker News scrapers have completed</li>
                    <li>• Run competitor analysis (Google Play scraper)</li>
                    <li>• Refine keywords to improve NLP coverage</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
