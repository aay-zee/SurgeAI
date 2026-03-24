import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { SentimentDistribution } from "./widgets/SentimentDistribution";
import { EngagementHeatmap } from "./widgets/EngagementHeatmap";
import { TrendingKeywords } from "./widgets/TrendingKeywords";
import { AIMarketingSuggestion } from "./widgets/AIMarketingSuggestion";
import { useCampaign } from "@/components/providers/CampaignProvider";
import { campaignService } from "@/services/campaign.service";
import { SentimentSummary, ValidationResult } from "@/types/campaign";

export function DashboardContent() {
  const { selectedCampaignId, selectedCampaign } = useCampaign();
  const campaignId = selectedCampaignId ? Number(selectedCampaignId) : null;

  const [summary, setSummary] = useState<SentimentSummary | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setSummary(null);
      setValidation(null);
      return;
    }
    campaignService
      .getCampaignSentimentSummary(campaignId)
      .then(setSummary)
      .catch(() => setSummary(null));

    campaignService
      .getValidationResult(campaignId)
      .then(setValidation)
      .catch(() => setValidation(null));
  }, [campaignId]);

  const stats = [
    {
      label: "Posts Analyzed",
      value: summary ? summary.total.toString() : "—",
      sub: selectedCampaign?.campaign_name ?? "No campaign selected",
      color: "emerald",
    },
    {
      label: "Positive Sentiment",
      value: summary ? `${summary.percentages.positive.toFixed(1)}%` : "—",
      sub: summary ? `${summary.counts.positive} of ${summary.total} posts` : "",
      color: "cyan",
    },
    {
      label: "Demand Score",
      value: validation?.demand_score != null ? `${validation.demand_score.toFixed(0)}/100` : "—",
      sub: validation
        ? validation.demand_score! >= 70 ? "Strong demand signal"
          : validation.demand_score! >= 40 ? "Moderate demand signal"
          : "Weak demand signal"
        : "Not yet computed",
      color: "indigo",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-3xl font-bold mb-2">SurgeAI Dashboard</h1>
          <p className="text-muted-foreground">
            AI-powered analytics and insights for your marketing campaigns
          </p>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={itemVariants}>
            <SentimentDistribution campaignId={campaignId} />
          </motion.div>

          <motion.div variants={itemVariants}>
            <EngagementHeatmap />
          </motion.div>

          <motion.div variants={itemVariants}>
            <TrendingKeywords campaignId={campaignId} />
          </motion.div>

          <motion.div variants={itemVariants}>
            <AIMarketingSuggestion campaignId={campaignId} />
          </motion.div>
        </div>

        {/* Stats Row — real data */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="bg-card rounded-2xl p-6 border shadow-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{stat.sub}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
