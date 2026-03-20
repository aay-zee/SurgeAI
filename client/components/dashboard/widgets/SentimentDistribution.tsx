import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import { useCampaign } from "@/components/providers/CampaignProvider";
import { campaignService } from "@/services/campaign.service";

export function SentimentDistribution() {
  const { isDark } = useTheme();
  const { selectedCampaignId } = useCampaign();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCampaignId) {
      setLoading(false);
      return;
    }

    const fetchSentimentData = async () => {
      try {
        setLoading(true);
        setError(null);
        const summary = await campaignService.getCampaignSentimentSummary(
          parseInt(selectedCampaignId)
        );

        if (summary && summary.percentages) {
          const chartData = [
            {
              name: "Positive",
              value: summary.percentages.positive || 0,
              color: "#10b981",
            },
            {
              name: "Neutral",
              value: summary.percentages.neutral || 0,
              color: "#f59e0b",
            },
            {
              name: "Negative",
              value: summary.percentages.negative || 0,
              color: "#ef4444",
            },
          ];
          setData(chartData);
        }
      } catch (err: any) {
        console.error("Failed to fetch sentiment data:", err);
        setError("No sentiment data available");
        // Show fallback data
        setData([
          { name: "Positive", value: 0, color: "#10b981" },
          { name: "Neutral", value: 0, color: "#f59e0b" },
          { name: "Negative", value: 0, color: "#ef4444" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSentimentData();
  }, [selectedCampaignId]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-3 rounded-lg shadow-lg border ${
            isDark
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-gray-200"
          }`}
        >
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].value.toFixed(1)}% of total sentiment
          </p>
        </div>
      );
    }
    return null;
  };

  const positivePercentage =
    data.find((d) => d.name === "Positive")?.value || 0;

  if (loading) {
    return (
      <Card className="p-6 h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
          <p className="text-muted-foreground">Loading sentiment data...</p>
        </div>
      </Card>
    );
  }

  if (error && data.every((d) => d.value === 0)) {
    return (
      <Card className="p-6 h-96 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Data will appear after campaign scraping completes
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 h-96">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Sentiment Distribution</h3>
            <p className="text-sm text-muted-foreground">
              Customer sentiment analysis across all channels
            </p>
          </div>
          <div className="flex space-x-2">
            {data.map((item) => (
              <div key={item.name} className="flex items-center space-x-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={1000}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <motion.div
          className="mt-4 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-2xl font-bold text-emerald-500">
            {positivePercentage.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground">
            Positive sentiment
          </p>
        </motion.div>
      </motion.div>
    </Card>
  );
}
