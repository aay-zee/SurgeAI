"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/cards/MetricCard";
import { MarketSignals } from "@/types/campaign";
import { motion } from "motion/react";
import { TrendingUp, BarChart3, DollarSign, Target, Loader2 } from "lucide-react";

interface MarketSignalsTabProps {
  signals: MarketSignals;
  onAnalyze: () => Promise<void>;
}

export function MarketSignalsTab({ signals, onAnalyze }: MarketSignalsTabProps) {
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await onAnalyze();
    } finally {
      setAnalyzing(false);
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

  // Determine market opportunity interpretation
  const getMarketOpportunity = () => {
    const volume = signals.monthly_search_volume || 0;
    if (volume > 100000) return "Mass market opportunity";
    if (volume >= 10000) return "Niche but viable";
    if (volume >= 1000) return "Very niche";
    return "Insufficient volume";
  };

  // Determine competition assessment
  const getCompetitionAssessment = () => {
    const level = signals.search_competition?.toLowerCase() || "unknown";
    if (level === "high") return "Highly competitive";
    if (level === "medium") return "Moderate competition";
    if (level === "low") return "Low competition";
    return "Unknown";
  };

  // Determine CPC profitability interpretation
  const getCPCInterpretation = () => {
    const cpc = signals.estimated_cpc || 0;
    if (cpc > 5) return "Highly profitable market";
    if (cpc > 2) return "Moderately profitable";
    if (cpc > 0.5) return "Low profitability";
    return "No clear monetization";
  };

  // Determine trend interpretation
  const getTrendInterpretation = () => {
    const trend = signals.trend_direction?.toLowerCase() || "unknown";
    if (trend === "rising") return "Market is growing";
    if (trend === "stable") return "Market is stable";
    if (trend === "falling") return "Market is declining";
    return "Trend unknown";
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header with Analyze Button */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between gap-4"
      >
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Market Signals</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Quantitative market data showing demand, competition, and profitability
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={analyzing}>
          {analyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {analyzing ? "Analyzing..." : "Refresh Analysis"}
        </Button>
      </motion.div>

      {/* Info Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">What Are Market Signals?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Market signals are quantitative indicators of market opportunity from Google search
              data. They measure actual demand (search volume), competitive intensity, and
              commercial viability (CPC and trends).
            </p>
            <p className="text-muted-foreground">
              💡 Higher search volume + lower competition + higher CPC = stronger opportunity.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Market Metrics Grid */}
      <motion.div variants={itemVariants}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Monthly Search Volume */}
          <MetricCard
            label="Monthly Search Volume"
            value={
              signals.monthly_search_volume
                ? `${(signals.monthly_search_volume / 1000).toFixed(1)}K`
                : "N/A"
            }
            interpretation={getMarketOpportunity()}
            icon={<Target className="h-5 w-5" />}
            valueColor={
              (signals.monthly_search_volume || 0) > 100000
                ? "text-green-600"
                : (signals.monthly_search_volume || 0) >= 10000
                  ? "text-amber-600"
                  : "text-red-600"
            }
            size="lg"
          />

          {/* Search Competition */}
          <MetricCard
            label="Competition Level"
            value={signals.search_competition || "N/A"}
            interpretation={getCompetitionAssessment()}
            icon={<BarChart3 className="h-5 w-5" />}
            valueColor={
              signals.search_competition?.toLowerCase() === "low"
                ? "text-green-600"
                : signals.search_competition?.toLowerCase() === "medium"
                  ? "text-amber-600"
                  : "text-red-600"
            }
            size="lg"
          />

          {/* Estimated CPC */}
          <MetricCard
            label="Estimated CPC"
            value={signals.estimated_cpc ? `$${signals.estimated_cpc.toFixed(2)}` : "N/A"}
            interpretation={getCPCInterpretation()}
            icon={<DollarSign className="h-5 w-5" />}
            valueColor={
              (signals.estimated_cpc || 0) > 5
                ? "text-green-600"
                : (signals.estimated_cpc || 0) > 2
                  ? "text-amber-600"
                  : "text-red-600"
            }
            size="lg"
          />

          {/* Trend Direction */}
          <MetricCard
            label="Trend Direction"
            value={
              signals.trend_direction === "rising"
                ? "📈 Rising"
                : signals.trend_direction === "stable"
                  ? "→ Stable"
                  : signals.trend_direction === "falling"
                    ? "📉 Falling"
                    : "N/A"
            }
            interpretation={getTrendInterpretation()}
            icon={<TrendingUp className="h-5 w-5" />}
            valueColor={
              signals.trend_direction === "rising"
                ? "text-green-600"
                : signals.trend_direction === "stable"
                  ? "text-amber-600"
                  : "text-red-600"
            }
            size="lg"
          />
        </div>
      </motion.div>

      {/* Detailed Metrics */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detailed Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Monthly Search Volume Details */}
              <div className="space-y-2">
                <h4 className="font-medium">Monthly Search Volume</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {signals.monthly_search_volume?.toLocaleString() || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(signals.monthly_search_volume || 0) > 100000
                    ? "✓ Mass market with significant demand"
                    : (signals.monthly_search_volume || 0) >= 10000
                      ? "✓ Viable niche market opportunity"
                      : (signals.monthly_search_volume || 0) >= 1000
                        ? "⚠ Very small niche market"
                        : "✗ Insufficient market demand detected"}
                </p>
              </div>

              {/* Competition Details */}
              <div className="space-y-2">
                <h4 className="font-medium">Search Competition</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {signals.search_competition || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {signals.search_competition === "HIGH"
                    ? "✓ Highly competitive — established market"
                    : signals.search_competition === "MEDIUM"
                      ? "✓ Moderately competitive — room for differentiation"
                      : "✓ Low competition — potential blue ocean opportunity"}
                </p>
              </div>

              {/* CPC Details */}
              <div className="space-y-2">
                <h4 className="font-medium">Cost Per Click (CPC)</h4>
                <p className="text-2xl font-bold text-green-600">
                  ${(signals.estimated_cpc || 0).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(signals.estimated_cpc || 0) > 5
                    ? "✓ High CPC indicates commercial interest"
                    : (signals.estimated_cpc || 0) > 2
                      ? "✓ Moderate CPC — some monetization potential"
                      : "⚠ Low CPC — limited monetization potential"}
                </p>
              </div>

              {/* Trend Details */}
              <div className="space-y-2">
                <h4 className="font-medium">Trend Direction</h4>
                <p className="text-2xl font-bold">
                  {signals.trend_direction === "rising"
                    ? "📈 Rising"
                    : signals.trend_direction === "stable"
                      ? "→ Stable"
                      : signals.trend_direction === "falling"
                        ? "📉 Falling"
                        : "Unknown"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {signals.trend_direction === "rising"
                    ? "✓ Market is growing — good timing"
                    : signals.trend_direction === "stable"
                      ? "✓ Steady market — predictable opportunity"
                      : signals.trend_direction === "falling"
                        ? "⚠ Market is shrinking — reconsider timing"
                        : "Unknown market trajectory"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Market Opportunity Analysis */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Market Opportunity Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(() => {
              const volume = signals.monthly_search_volume || 0;
              const competition = signals.search_competition?.toLowerCase() || "";
              const cpc = signals.estimated_cpc || 0;
              const trend = signals.trend_direction?.toLowerCase() || "";

              const signals_list = [];

              // Volume signals
              if (volume > 100000) signals_list.push("✓ High search volume (mass market)");
              else if (volume >= 10000) signals_list.push("✓ Moderate search volume (niche viable)");
              else signals_list.push("✗ Low search volume");

              // Competition signals
              if (competition === "low") signals_list.push("✓ Low competition (differentiation easier)");
              else if (competition === "medium")
                signals_list.push("⚠ Moderate competition (established players exist)");
              else signals_list.push("✗ High competition (crowded market)");

              // CPC signals
              if (cpc > 5) signals_list.push("✓ High CPC (profitable market)");
              else if (cpc > 2) signals_list.push("⚠ Moderate CPC (some monetization)");
              else signals_list.push("✗ Low CPC (limited monetization)");

              // Trend signals
              if (trend === "rising") signals_list.push("✓ Rising trend (growing market)");
              else if (trend === "stable") signals_list.push("→ Stable trend (predictable)");
              else if (trend === "falling") signals_list.push("✗ Falling trend (declining market)");

              return (
                <>
                  {signals_list.map((signal, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="flex-shrink-0">{signal.slice(0, 1)}</span>
                      <span>{signal.slice(2)}</span>
                    </div>
                  ))}

                  <div className="pt-3 border-t">
                    <p className="font-medium mb-2">💡 Overall Assessment:</p>
                    <p className="text-muted-foreground">
                      {volume > 100000 && competition === "low" && cpc > 5 && trend === "rising"
                        ? "Exceptional opportunity: High demand, low competition, profitable, and growing. Strong signals to proceed."
                        : volume > 100000 && cpc > 5
                          ? "Strong opportunity: Large market with commercial viability. Competition level is key factor."
                          : volume >= 10000 && cpc > 2
                            ? "Moderate opportunity: Viable niche market with some profitability. Focus on differentiation."
                            : "Weak opportunity: Limited market signals. Consider keyword refinement or pivot."}
                    </p>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </motion.div>

      {/* How It Works */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How Market Signals Are Calculated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="font-bold text-blue-600">1</span>
              <div>
                <p className="font-medium">Search Volume Query</p>
                <p className="text-muted-foreground">
                  Monthly search volume for each keyword via Google Keyword Planner (SerpAPI)
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-blue-600">2</span>
              <div>
                <p className="font-medium">Competition Analysis</p>
                <p className="text-muted-foreground">
                  Competition level (Low/Medium/High) and competition index (0-100)
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-blue-600">3</span>
              <div>
                <p className="font-medium">CPC Estimation</p>
                <p className="text-muted-foreground">
                  Cost per click for advertisers, indicating market profitability
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-blue-600">4</span>
              <div>
                <p className="font-medium">Trend Detection</p>
                <p className="text-muted-foreground">
                  Rising/Stable/Falling trend indicating market growth direction
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground pt-2">
              All data sourced from Google search trends and keyword analysis tools
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Interpretation Guide */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interpretation Guide</CardTitle>
            <CardDescription>Understanding market signal combinations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">🟢 Strong Signals</p>
              <p>
                Volume &gt;100K + Low competition + CPC &gt;$5 + Rising trend = Exceptional
                opportunity with high confidence to proceed
              </p>
            </div>

            <div>
              <p className="font-medium text-foreground mb-1">🟡 Moderate Signals</p>
              <p>
                Volume 10K-100K + Medium competition + CPC $2-5 = Viable niche with opportunities
                for differentiation
              </p>
            </div>

            <div>
              <p className="font-medium text-foreground mb-1">🔴 Weak Signals</p>
              <p>
                Volume &lt;1K + High competition + CPC &lt;$2 + Falling trend = Limited opportunity,
                reconsider market or pivot keywords
              </p>
            </div>

            <div className="pt-2 border-t">
              <p className="font-medium text-foreground mb-1">⚠️ Important Notes</p>
              <p>
                Market signals alone don't validate a business idea. Combine with customer feedback
                (themes), competitor analysis, and problem clarity for comprehensive validation.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
