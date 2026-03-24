"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { useTheme } from "@/components/theme-provider";
import { Card } from "@/components/ui/card";
import { useCampaign } from "@/components/providers/CampaignProvider";
import { campaignService } from "@/services/campaign.service";
import { ScrapedData, SentimentSummary, ValidationResult } from "@/types/campaign";
import { Loader2 } from "lucide-react";

const INTENT_COLORS: Record<string, string> = {
  "buying intent":      "#10b981",
  "pain point":         "#f97316",
  "feature request":    "#3b82f6",
  "positive feedback":  "#34d399",
  "general discussion": "#94a3b8",
};

export function AnalyticsContent() {
  const { isDark } = useTheme();
  const { selectedCampaignId, selectedCampaign } = useCampaign();
  const campaignId = selectedCampaignId ? Number(selectedCampaignId) : null;

  const [posts, setPosts] = useState<ScrapedData[]>([]);
  const [summary, setSummary] = useState<SentimentSummary | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);
    Promise.all([
      campaignService.getCampaignScrapedData(campaignId),
      campaignService.getCampaignSentimentSummary(campaignId),
      campaignService.getValidationResult(campaignId).catch(() => null),
    ])
      .then(([postsData, summaryData, validationData]) => {
        setPosts(postsData);
        setSummary(summaryData);
        setValidation(validationData);
      })
      .finally(() => setLoading(false));
  }, [campaignId]);

  // Sentiment bar chart data
  const sentimentData = summary
    ? [
        { label: "Positive", count: summary.counts.positive,  pct: summary.percentages.positive,  fill: "#10b981" },
        { label: "Neutral",  count: summary.counts.neutral,   pct: summary.percentages.neutral,   fill: "#f59e0b" },
        { label: "Negative", count: summary.counts.negative,  pct: summary.percentages.negative,  fill: "#ef4444" },
      ]
    : [];

  // Intent breakdown from posts
  const intentCounts: Record<string, number> = {};
  posts.forEach((post) => {
    const intent = post.analysis?.intent;
    if (intent) intentCounts[intent] = (intentCounts[intent] || 0) + 1;
  });
  const totalWithIntent = Object.values(intentCounts).reduce((a, b) => a + b, 0);
  const intentData = Object.entries(intentCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([intent, count]) => ({
      intent,
      count,
      pct: totalWithIntent > 0 ? Math.round((count / totalWithIntent) * 100) : 0,
    }));

  // Top topics from NLP
  const wordCounts: Record<string, number> = {};
  posts.forEach((post) => {
    post.analysis?.topics?.top_words?.forEach((word) => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
  });
  const topTopics = Object.entries(wordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([word, count]) => ({ word, count }));
  const maxTopicCount = topTopics[0]?.count || 1;

  const gridColor = isDark ? "#374151" : "#e5e7eb";
  const axisColor = isDark ? "#9ca3af" : "#6b7280";

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg border text-sm ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
          <p className="font-medium">{payload[0].payload.label || payload[0].payload.intent}</p>
          <p>{payload[0].value} posts · {payload[0].payload.pct}%</p>
        </div>
      );
    }
    return null;
  };

  if (!campaignId) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-muted-foreground">
        Select a campaign from the top navigation to view insights.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading insights…
      </div>
    );
  }

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-1">Campaign Insights</h1>
          <p className="text-muted-foreground">
            {selectedCampaign?.campaign_name ?? "Selected campaign"} · {summary?.total ?? 0} posts analyzed
          </p>
        </div>

        {/* Validation Score + Sentiment side by side */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Demand score */}
          {validation && (() => {
            const score = validation.demand_score ?? 0;
            const color = score >= 70 ? "text-green-500" : score >= 40 ? "text-yellow-500" : "text-red-500";
            const bg    = score >= 70 ? "border-green-500/30 bg-green-500/5" : score >= 40 ? "border-yellow-500/30 bg-yellow-500/5" : "border-red-500/30 bg-red-500/5";
            return (
              <Card className={`p-6 border-2 ${bg} flex flex-col justify-center`}>
                <p className="text-sm text-muted-foreground mb-1">Idea Validation Score</p>
                <p className={`text-5xl font-bold ${color}`}>{score.toFixed(0)}<span className="text-xl text-muted-foreground">/100</span></p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{validation.summary}</p>
              </Card>
            );
          })()}

          {/* Sentiment counts */}
          <Card className="p-6 md:col-span-2">
            <h3 className="text-base font-semibold mb-4">Sentiment Breakdown</h3>
            {sentimentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={sentimentData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="label" stroke={axisColor} fontSize={12} />
                  <YAxis stroke={axisColor} fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {sentimentData.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">No sentiment data yet.</p>
            )}
          </Card>
        </div>

        {/* Intent breakdown */}
        <Card className="p-6">
          <h3 className="text-base font-semibold mb-4">
            User Intent Breakdown
            <span className="text-sm text-muted-foreground font-normal ml-2">
              — what are people actually discussing?
            </span>
          </h3>
          {intentData.length > 0 ? (
            <div className="space-y-3">
              {intentData.map(({ intent, count, pct }) => (
                <div key={intent} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize font-medium">{intent}</span>
                    <span className="text-muted-foreground">{count} posts · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: INTENT_COLORS[intent] ?? "#94a3b8" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No intent data yet — campaign may still be processing.</p>
          )}
        </Card>

        {/* Top topics */}
        <Card className="p-6">
          <h3 className="text-base font-semibold mb-4">
            Top Discussed Topics
            <span className="text-sm text-muted-foreground font-normal ml-2">
              — most frequent words across all analyzed posts
            </span>
          </h3>
          {topTopics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topTopics.map(({ word, count }) => {
                const size = 0.75 + (count / maxTopicCount) * 0.75;
                return (
                  <span
                    key={word}
                    className="px-3 py-1 rounded-full border font-medium transition-all hover:scale-105 cursor-default"
                    style={{
                      fontSize: `${size}rem`,
                      backgroundColor: isDark ? "rgba(34,211,238,0.1)" : "rgba(59,130,246,0.1)",
                      borderColor: isDark ? "rgba(34,211,238,0.3)" : "rgba(59,130,246,0.3)",
                      color: isDark ? "#22d3ee" : "#2563eb",
                    }}
                  >
                    {word}
                    <span className="text-xs text-muted-foreground ml-1">×{count}</span>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No topic data yet — campaign may still be processing.</p>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
