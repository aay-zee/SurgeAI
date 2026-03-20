import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { SentimentDistribution } from "./widgets/SentimentDistribution";
import { EngagementHeatmap } from "./widgets/EngagementHeatmap";
import { TrendingKeywords } from "./widgets/TrendingKeywords";
import { AIMarketingSuggestion } from "./widgets/AIMarketingSuggestion";
import { useCampaign } from "@/components/providers/CampaignProvider";
import { campaignService } from "@/services/campaign.service";

export function DashboardContent() {
  const { selectedCampaignId } = useCampaign();
  const [stats, setStats] = useState<any[]>([
    { label: "Total Data Points", value: "0", change: "+0%", color: "emerald" },
    { label: "Validation Score", value: "0/10", change: "+0%", color: "cyan" },
    { label: "Confidence Score", value: "0%", change: "+0%", color: "indigo" },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedCampaignId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);

        // Fetch scraped data count
        const scrapedData = await campaignService.getCampaignScrapedData(
          parseInt(selectedCampaignId)
        );
        const dataPointCount = scrapedData?.length || 0;

        // Fetch validation scores
        let validationScore = "0";
        try {
          const scores = await campaignService.getValidationScores(
            parseInt(selectedCampaignId)
          );
          validationScore = (scores?.overall_score || 0)?.toFixed(1) || "0";
        } catch (err) {
          // If no scores yet, try to calculate them
          try {
            const calcResult = await campaignService.calculateValidationScores(
              parseInt(selectedCampaignId)
            );
            validationScore =
              (calcResult?.overall_score || 0)?.toFixed(1) || "0";
          } catch (e) {
            // Silent fail
          }
        }

        // Fetch confidence score
        let confidenceScore = "0%";
        try {
          const confidence = await campaignService.calculateConfidence(
            parseInt(selectedCampaignId)
          );
          const score =
            confidence?.confidence_percentage || confidence?.confidence_score || "0";
          if (typeof score === "number") {
            confidenceScore = score.toFixed(0) + "%";
          } else {
            confidenceScore = String(score) + (String(score).includes("%") ? "" : "%");
          }
        } catch (err) {
          // Silent fail
        }

        setStats([
          {
            label: "Total Data Points",
            value: dataPointCount.toString(),
            change: "+0%",
            color: "emerald",
          },
          {
            label: "Validation Score",
            value: `${validationScore}/10`,
            change: "+0%",
            color: "cyan",
          },
          {
            label: "Confidence Score",
            value: confidenceScore,
            change: "+0%",
            color: "indigo",
          },
        ]);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedCampaignId]);

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
      transition: {
        duration: 0.5,
      },
    },
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
          {/* Sentiment Distribution */}
          <motion.div variants={itemVariants}>
            <SentimentDistribution />
          </motion.div>

          {/* Engagement Heatmap */}
          <motion.div variants={itemVariants}>
            <EngagementHeatmap />
          </motion.div>

          {/* Trending Keywords */}
          <motion.div variants={itemVariants}>
            <TrendingKeywords />
          </motion.div>

          {/* AI Marketing Suggestion */}
          <motion.div variants={itemVariants}>
            <AIMarketingSuggestion />
          </motion.div>
        </div>

        {/* Additional Stats Row */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6"
        >
          {[
            {
              label: "Total Engagement",
              value: "2.4M",
              change: "+12%",
              color: "emerald",
            },
            {
              label: "Campaign ROI",
              value: "340%",
              change: "+8%",
              color: "cyan",
            },
            {
              label: "AI Accuracy",
              value: "96.7%",
              change: "+2%",
              color: "indigo",
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="bg-card rounded-2xl p-6 border shadow-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-muted-foreground text-sm">{stat.label}</p>
                <span className={`text-${stat.color}-500 text-sm font-medium`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
