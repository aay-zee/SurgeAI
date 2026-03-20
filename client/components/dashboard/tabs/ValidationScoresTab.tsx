"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ValidationScoreCard } from "@/components/cards/ValidationScoreCard";
import { ValidationScores } from "@/types/campaign";
import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Target,
  Users,
  Zap,
  Lightbulb,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface ValidationScoresTabProps {
  scores: ValidationScores;
  onCalculate: () => Promise<void>;
}

export function ValidationScoresTab({
  scores,
  onCalculate,
}: ValidationScoresTabProps) {
  const [calculating, setCalculating] = useState(false);

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      await onCalculate();
    } finally {
      setCalculating(false);
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

  // Icon mapping for dimensions
  const dimensionIcons: Record<string, React.ReactNode> = {
    market_size: <Target className="h-5 w-5" />,
    demand: <Users className="h-5 w-5" />,
    problem_clarity: <Lightbulb className="h-5 w-5" />,
    competitor_gap: <TrendingUp className="h-5 w-5" />,
    technical_feasibility: <Zap className="h-5 w-5" />,
    market_growth: <TrendingUp className="h-5 w-5" />,
    pain_point_severity: <AlertCircle className="h-5 w-5" />,
    monetization_potential: <DollarSign className="h-5 w-5" />,
  };

  // Format dimension name
  const formatDimensionName = (name: string) => {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Prepare data for radar chart
  const radarData = [
    {
      name: "Market Size",
      score: scores.market_size.score,
      fullMark: 10,
    },
    {
      name: "Demand",
      score: scores.demand.score,
      fullMark: 10,
    },
    {
      name: "Problem Clarity",
      score: scores.problem_clarity.score,
      fullMark: 10,
    },
    {
      name: "Competitor Gap",
      score: scores.competitor_gap.score,
      fullMark: 10,
    },
    {
      name: "Tech Feasibility",
      score: scores.technical_feasibility.score,
      fullMark: 10,
    },
    {
      name: "Market Growth",
      score: scores.market_growth.score,
      fullMark: 10,
    },
    {
      name: "Pain Severity",
      score: scores.pain_point_severity.score,
      fullMark: 10,
    },
    {
      name: "Monetization",
      score: scores.monetization_potential.score,
      fullMark: 10,
    },
  ];

  // All dimensions for card grid
  const dimensions = [
    { key: "market_size", label: "Market Size" },
    { key: "demand", label: "Demand" },
    { key: "problem_clarity", label: "Problem Clarity" },
    { key: "competitor_gap", label: "Competitor Gap" },
    { key: "technical_feasibility", label: "Technical Feasibility" },
    { key: "market_growth", label: "Market Growth" },
    { key: "pain_point_severity", label: "Pain Point Severity" },
    { key: "monetization_potential", label: "Monetization Potential" },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header with Calculate Button */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Validation Scoring</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive 8-dimension analysis of your idea's viability
          </p>
        </div>
        <Button onClick={handleCalculate} disabled={calculating}>
          {calculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {calculating ? "Calculating..." : "Recalculate"}
        </Button>
      </motion.div>

      {/* Overall Score Summary */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardHeader>
            <CardTitle>Overall Validation Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-4">
              <div className="text-6xl font-bold text-blue-600 dark:text-blue-400">
                {scores.overall_score.toFixed(1)}
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold">/ 10</p>
                <p className="text-sm text-muted-foreground">
                  Average of 8 dimensions
                </p>
              </div>
            </div>

            {/* Interpretation */}
            <div className="pt-2">
              {scores.overall_score >= 7 && (
                <p className="text-sm text-green-700 dark:text-green-400">
                  ✅ Strong validation signals - High confidence to proceed
                </p>
              )}
              {scores.overall_score >= 4 && scores.overall_score < 7 && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  ⚠️ Moderate validation signals - Consider refinements before launch
                </p>
              )}
              {scores.overall_score < 4 && (
                <p className="text-sm text-red-700 dark:text-red-400">
                  ❌ Weak validation signals - Significant improvements needed
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Radar Chart */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Dimension Visualization</CardTitle>
            <CardDescription>
              Spider diagram showing performance across all 8 dimensions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="currentColor" className="text-muted" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <PolarRadiusAxis angle={90} domain={[0, 10]} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="currentColor"
                  fill="currentColor"
                  fillOpacity={0.6}
                  className="text-blue-600"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* 8 Dimension Cards */}
      <motion.div variants={itemVariants}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {dimensions.map((dimension) => {
            const key = dimension.key as keyof ValidationScores;
            const data = scores[key];

            if (typeof data === "object" && "score" in data) {
              return (
                <ValidationScoreCard
                  key={dimension.key}
                  title={dimension.label}
                  score={data.score}
                  reason={data.reason}
                  icon={dimensionIcons[dimension.key]}
                />
              );
            }
            return null;
          })}
        </div>
      </motion.div>

      {/* Dimension Descriptions */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dimension Explanations</CardTitle>
            <CardDescription>
              What each validation dimension measures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Market Size</h4>
                <p className="text-sm text-muted-foreground">
                  Based on monthly search volume - indicates total addressable market
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Demand</h4>
                <p className="text-sm text-muted-foreground">
                  Positive sentiment ratio - shows if people want this solution
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Problem Clarity</h4>
                <p className="text-sm text-muted-foreground">
                  Stack Exchange answered ratio - indicates problem is well-understood
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Competitor Gap</h4>
                <p className="text-sm text-muted-foreground">
                  Competitor negative reviews - shows gaps in existing solutions
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Technical Feasibility</h4>
                <p className="text-sm text-muted-foreground">
                  Answered questions & votes - indicates solvability
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Market Growth</h4>
                <p className="text-sm text-muted-foreground">
                  Trends and growth signals - shows market is expanding
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Pain Severity</h4>
                <p className="text-sm text-muted-foreground">
                  Negative feedback frequency - shows problem is acute
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Monetization</h4>
                <p className="text-sm text-muted-foreground">
                  CPC and market size - indicates commercial opportunity
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Scoring Methodology */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How Scoring Works</CardTitle>
            <CardDescription>
              Each dimension scored 1-10 based on market data
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>
              ✓ <strong>Positive (7-10):</strong> Strong signals, proceed with confidence
            </p>
            <p>
              ⚠️ <strong>Moderate (4-6):</strong> Mixed signals, refine before launch
            </p>
            <p>
              ✗ <strong>Weak (1-3):</strong> Weak signals, significant improvements needed
            </p>
            <p className="pt-2">
              Overall score is the average of all 8 dimensions, giving you a holistic
              view of your idea's validation level.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
