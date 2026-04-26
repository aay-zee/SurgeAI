"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MarketSignals } from "@/types/campaign";
import { motion } from "motion/react";
import { TrendingUp, MessageSquare, ShoppingCart, Store, Loader2, RefreshCw, BarChart2 } from "lucide-react";
import { campaignService } from "@/services/campaign.service";
import { toast } from "sonner";

interface MarketSignalsTabProps {
  signals: MarketSignals;
  campaignId: number;
  onAnalyze: () => Promise<void>;
}

export function MarketSignalsTab({ signals, campaignId, onAnalyze }: MarketSignalsTabProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [runningTrends, setRunningTrends] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await onAnalyze();
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunTrends = async () => {
    setRunningTrends(true);
    try {
      await campaignService.runTrendsScraper(campaignId);
      toast.success("Google Trends scraper queued. Refresh signals in ~30 seconds.");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to queue Trends scraper.");
    } finally {
      setRunningTrends(false);
    }
  };

  const hasAnyData =
    signals.discussion_volume != null ||
    signals.trend_direction != null ||
    signals.buying_intent_pct != null ||
    signals.competitor_saturation != null;

  // ── Volume helpers ──────────────────────────────────────────────────────────
  const getVolumeLabel = () => {
    const v = signals.discussion_volume ?? 0;
    if (v >= 50) return "High discussion volume";
    if (v >= 20) return "Moderate discussion";
    if (v >= 5)  return "Low discussion";
    return "Very low discussion";
  };
  const getVolumeColor = () => {
    const v = signals.discussion_volume ?? 0;
    if (v >= 50) return "text-green-600";
    if (v >= 20) return "text-amber-600";
    return "text-red-600";
  };

  // ── Trend helpers ───────────────────────────────────────────────────────────
  const getTrendLabel = () => {
    if (!signals.trend_direction) return signals.has_trends_data === false ? "Run Trends scraper" : "No data yet";
    if (signals.trend_direction === "rising")  return "Market is growing";
    if (signals.trend_direction === "stable")  return "Market is stable";
    if (signals.trend_direction === "falling") return "Market is declining";
    return "Unknown";
  };
  const getTrendColor = () => {
    if (signals.trend_direction === "rising")  return "text-green-600";
    if (signals.trend_direction === "stable")  return "text-amber-600";
    if (signals.trend_direction === "falling") return "text-red-600";
    return "text-muted-foreground";
  };
  const getTrendDisplay = () => {
    if (signals.trend_direction === "rising")  return "📈 Rising";
    if (signals.trend_direction === "stable")  return "→ Stable";
    if (signals.trend_direction === "falling") return "📉 Falling";
    return "N/A";
  };

  // ── Buying intent helpers ───────────────────────────────────────────────────
  const getBuyingLabel = () => {
    const pct = signals.buying_intent_pct ?? 0;
    if (pct >= 20) return "Strong buying signals";
    if (pct >= 10) return "Moderate buying signals";
    if (pct > 0)   return "Weak buying signals";
    return "No buying intent detected";
  };
  const getBuyingColor = () => {
    const pct = signals.buying_intent_pct ?? 0;
    if (pct >= 20) return "text-green-600";
    if (pct >= 10) return "text-amber-600";
    return "text-red-600";
  };

  // ── Competitor saturation helpers ───────────────────────────────────────────
  const getCompDisplay = () => {
    if (!signals.competitor_saturation) return signals.has_gplay_data === false ? "Run GP scraper" : "N/A";
    return signals.competitor_saturation.charAt(0).toUpperCase() + signals.competitor_saturation.slice(1);
  };
  const getCompLabel = () => {
    if (!signals.competitor_saturation) return "No competitor data yet";
    if (signals.competitor_saturation === "low")    return "Competitor gap exists";
    if (signals.competitor_saturation === "medium") return "Some room to compete";
    return "Saturated — differentiate hard";
  };
  const getCompColor = () => {
    if (signals.competitor_saturation === "low")    return "text-green-600";
    if (signals.competitor_saturation === "medium") return "text-amber-600";
    return "text-red-600";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Market Signals</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Derived from scraped data — discussion volume, buying intent, trends, and competitor gaps
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRunTrends} disabled={runningTrends}>
            {runningTrends ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart2 className="mr-2 h-4 w-4" />}
            {runningTrends ? "Queuing..." : "Run Trends"}
          </Button>
          <Button variant="outline" onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {analyzing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </motion.div>

      {/* Data source note */}
      <motion.div variants={itemVariants}>
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="py-3 text-sm text-blue-800 dark:text-blue-200">
            Signals are derived from your scraped Reddit and HackerNews data.
            Trend direction requires the Google Trends scraper to have run for this campaign.
            Competitor saturation requires the Google Play scraper.
          </CardContent>
        </Card>
      </motion.div>

      {/* 4 metric cards */}
      <motion.div variants={itemVariants}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          {/* Discussion Volume */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <CardTitle className="text-sm font-medium">Discussion Volume</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${getVolumeColor()}`}>
                {signals.discussion_volume ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{getVolumeLabel()}</p>
            </CardContent>
          </Card>

          {/* Trend Direction */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <CardTitle className="text-sm font-medium">Trend Direction</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${getTrendColor()}`}>
                {getTrendDisplay()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{getTrendLabel()}</p>
            </CardContent>
          </Card>

          {/* Buying Intent */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShoppingCart className="h-4 w-4" />
                <CardTitle className="text-sm font-medium">Buying Intent</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${getBuyingColor()}`}>
                {signals.buying_intent_pct != null ? `${signals.buying_intent_pct}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{getBuyingLabel()}</p>
            </CardContent>
          </Card>

          {/* Competitor Saturation */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Store className="h-4 w-4" />
                <CardTitle className="text-sm font-medium">Competitor Saturation</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${getCompColor()}`}>
                {getCompDisplay()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{getCompLabel()}</p>
            </CardContent>
          </Card>

        </div>
      </motion.div>

      {/* Summary interpretation */}
      {hasAnyData && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overall Assessment</CardTitle>
              <CardDescription>Based on available signals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                signals.discussion_volume != null && (
                  (signals.discussion_volume ?? 0) >= 50
                    ? "✓ High discussion volume — people are actively talking about this space"
                    : (signals.discussion_volume ?? 0) >= 20
                      ? "⚠ Moderate discussion — niche audience exists"
                      : "✗ Low discussion volume — limited organic interest found"
                ),
                signals.trend_direction && (
                  signals.trend_direction === "rising"
                    ? "✓ Rising trend — market is growing, good timing"
                    : signals.trend_direction === "stable"
                      ? "→ Stable trend — predictable, mature market"
                      : "✗ Falling trend — declining market interest"
                ),
                signals.buying_intent_pct != null && (
                  (signals.buying_intent_pct ?? 0) >= 20
                    ? "✓ Strong buying intent — users are actively looking to pay for a solution"
                    : (signals.buying_intent_pct ?? 0) >= 10
                      ? "⚠ Moderate buying intent — some willingness to pay detected"
                      : "✗ Weak buying intent — users discussing but not ready to buy"
                ),
                signals.competitor_saturation && (
                  signals.competitor_saturation === "low"
                    ? "✓ Low competitor saturation — clear gap in the market"
                    : signals.competitor_saturation === "medium"
                      ? "⚠ Medium competition — room exists but differentiation needed"
                      : "✗ High competitor saturation — crowded space, hard to stand out"
                ),
              ]
                .filter(Boolean)
                .map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="shrink-0">{(line as string).slice(0, 1)}</span>
                    <span>{(line as string).slice(2)}</span>
                  </div>
                ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

    </motion.div>
  );
}
