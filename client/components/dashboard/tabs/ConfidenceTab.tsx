"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfidenceWidget } from "@/components/widgets/ConfidenceWidget";
import { WarningBanner } from "@/components/ui/WarningBanner";
import { ConfidenceScore } from "@/types/campaign";
import { motion } from "motion/react";
import { Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header with Recalculate Button */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between gap-4"
      >
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
            <p className="text-muted-foreground">
              💡 Use this score to understand the limitations of your report and prioritize
              which insights to act on first.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Confidence Widget */}
      <motion.div variants={itemVariants}>
        <ConfidenceWidget confidence={confidence} />
      </motion.div>

      {/* Warnings Section */}
      {confidence.warnings && confidence.warnings.length > 0 && (
        <motion.div variants={itemVariants}>
          <WarningBanner
            warnings={confidence.warnings}
            severity="warning"
            dismissible={false}
          />
        </motion.div>
      )}

      {/* Confidence Interpretation */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confidence Interpretation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {confidence.confidence_score >= 80 && (
              <div className="flex gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Excellent Data Quality
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-200 mt-1">
                    {confidence.confidence_score}% confidence indicates comprehensive data collection
                    from multiple diverse sources. Analysis findings are highly reliable. You can
                    confidently act on these insights.
                  </p>
                </div>
              </div>
            )}

            {confidence.confidence_score >= 60 && confidence.confidence_score < 80 && (
              <div className="flex gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    Good Data Quality
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-200 mt-1">
                    {confidence.confidence_score}% confidence indicates good data collection but some
                    sources may be underrepresented. Findings are generally reliable but consider
                    additional validation in weak areas.
                  </p>
                </div>
              </div>
            )}

            {confidence.confidence_score < 60 && (
              <div className="flex gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-100">Fair Data Quality</p>
                  <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                    {confidence.confidence_score}% confidence indicates limited data or low diversity
                    across sources. Findings should be validated with direct customer feedback before
                    making major decisions.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Volume Analysis */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Volume Analysis</CardTitle>
            <CardDescription>Quantity and diversity of data collected</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {confidence.factors && confidence.factors.length > 0 && (
              <div className="space-y-3">
                {confidence.factors.map((factor, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{factor.name}</span>
                      <span className="text-sm font-bold text-blue-600">
                        {factor.score.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          factor.score >= 80
                            ? "bg-green-600"
                            : factor.score >= 60
                              ? "bg-amber-600"
                              : "bg-red-600"
                        }`}
                        style={{ width: `${Math.min(factor.score, 100)}%` }}
                      />
                    </div>
                    {factor.reason && (
                      <p className="text-xs text-muted-foreground">{factor.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Sources Breakdown */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What Affects Your Confidence Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-2">
              <div className="flex gap-2">
                <span>📊</span>
                <div>
                  <p className="font-medium">Data Volume</p>
                  <p className="text-muted-foreground">
                    How much data was collected. More data = more confidence in patterns.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <span>🌍</span>
                <div>
                  <p className="font-medium">Data Diversity</p>
                  <p className="text-muted-foreground">
                    Data collected from multiple sources (Reddit, Stack Exchange, Google Play, etc.).
                    More sources = less bias.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <span>🔍</span>
                <div>
                  <p className="font-medium">Analysis Coverage</p>
                  <p className="text-muted-foreground">
                    Percentage of collected data that was successfully analyzed with NLP and theme
                    extraction.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <span>📅</span>
                <div>
                  <p className="font-medium">Data Freshness</p>
                  <p className="text-muted-foreground">
                    How recent the data is. Recent data reflects current market conditions better.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <span>✅</span>
                <div>
                  <p className="font-medium">Threshold Compliance</p>
                  <p className="text-muted-foreground">
                    Whether all critical metrics meet minimum quality thresholds for reliable
                    analysis.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Improvement Recommendations */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Improving Your Confidence Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {confidence.confidence_score < 80 && (
              <>
                <div className="flex gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Ways to increase confidence:
                    </p>
                    <ul className="space-y-1 text-blue-700 dark:text-blue-200">
                      <li>• Run scrappers again to collect more data from each platform</li>
                      <li>• Wait for more recent data (check Data Freshness factor)</li>
                      <li>• Refine keywords to improve analysis coverage</li>
                      <li>
                        • Check warnings section above — address any data quality issues noted
                      </li>
                      <li>
                        • Ensure all 6 platforms (Reddit, Hacker News, Product Hunt, Quora, Google
                        Play, Stack Exchange) have been analyzed
                      </li>
                    </ul>
                  </div>
                </div>
              </>
            )}

            {confidence.confidence_score >= 80 && (
              <>
                <div className="flex gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-green-700 dark:text-green-200">
                    ✓ Your data quality is excellent. You can confidently proceed with validation
                    and market research findings.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Confidence Score Methodology */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confidence Score Methodology</CardTitle>
            <CardDescription>How confidence is calculated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The confidence score is calculated from 5 key factors, each contributing to overall
              data quality:
            </p>

            <div className="space-y-2 pt-2">
              <div>
                <p className="font-medium text-foreground">1. Data Volume (20%)</p>
                <p>Number of data points collected. Minimum threshold: 100+ data points.</p>
              </div>

              <div>
                <p className="font-medium text-foreground">2. Data Diversity (20%)</p>
                <p>
                  Number of different sources with data. Minimum: 3+ sources. Maximum credit: 6
                  sources.
                </p>
              </div>

              <div>
                <p className="font-medium text-foreground">3. Analysis Coverage (20%)</p>
                <p>
                  Percentage of collected data successfully processed. Minimum: 70% processed.
                </p>
              </div>

              <div>
                <p className="font-medium text-foreground">4. Data Freshness (20%)</p>
                <p>How recent the data is. Data &lt;7 days old = maximum score.</p>
              </div>

              <div>
                <p className="font-medium text-foreground">5. Threshold Compliance (20%)</p>
                <p>
                  Whether all critical metrics pass quality checks (minimum unique items per theme,
                  sentiment variance, etc.).
                </p>
              </div>
            </div>

            <div className="pt-3 border-t">
              <p className="font-medium text-foreground mb-2">Score Ranges:</p>
              <ul className="space-y-1">
                <li>🟢 <strong>80–100%</strong>: Excellent — highly reliable insights</li>
                <li>🟡 <strong>60–79%</strong>: Good — generally reliable, some limitations</li>
                <li>🔴 <strong>&lt;60%</strong>: Fair — validate with additional research</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* When to Trust Your Analysis */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">When to Trust This Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">✅ High Confidence (80%+)</p>
              <p>
                Act confidently on themes, competitor gaps, and market signals. This analysis
                accurately reflects market demand and customer needs.
              </p>
            </div>

            <div>
              <p className="font-medium text-foreground mb-1">⚠️ Moderate Confidence (60-79%)</p>
              <p>
                Use as directional guidance. Prioritize high-frequency themes and most common
                competitor complaints. Consider validating with direct customer interviews for edge
                cases.
              </p>
            </div>

            <div>
              <p className="font-medium text-foreground mb-1">❌ Low Confidence (&lt;60%)</p>
              <p>
                Use primarily as starting hypothesis only. Before building, conduct direct customer
                validation, user interviews, or surveys to confirm problem-solution fit.
              </p>
            </div>

            <div className="pt-3 border-t">
              <p className="font-medium text-foreground mb-2">💡 In All Cases:</p>
              <p>
                Combine quantitative analysis (this report) with qualitative validation (customer
                interviews) before committing significant resources to development.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
