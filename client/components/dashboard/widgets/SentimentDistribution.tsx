import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import { campaignService } from "@/services/campaign.service";
import { SentimentSummary } from "@/types/campaign";

const COLORS = {
  Positive: "#10b981",
  Neutral:  "#f59e0b",
  Negative: "#ef4444",
};

interface SentimentDistributionProps {
  campaignId: number | null;
}

export function SentimentDistribution({ campaignId }: SentimentDistributionProps) {
  const { isDark } = useTheme();
  const [summary, setSummary] = useState<SentimentSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!campaignId) {
      setSummary(null);
      return;
    }
    setLoading(true);
    campaignService
      .getCampaignSentimentSummary(campaignId)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const data = summary
    ? [
        { name: "Positive", value: summary.percentages.positive },
        { name: "Neutral",  value: summary.percentages.neutral },
        { name: "Negative", value: summary.percentages.negative },
      ].filter((d) => d.value > 0)
    : [];

  const positivePct = summary ? summary.percentages.positive.toFixed(1) : "—";

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-3 rounded-lg shadow-lg border ${
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
          }`}
        >
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].value.toFixed(1)}% of posts
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Sentiment Distribution</h3>
            <p className="text-sm text-muted-foreground">
              {summary
                ? `Based on ${summary.total} analyzed posts`
                : "Select a campaign to view data"}
            </p>
          </div>
          <div className="flex space-x-2">
            {Object.entries(COLORS).map(([name, color]) => (
              <div key={name} className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-muted-foreground">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
            Loading…
          </div>
        ) : !campaignId || !summary || summary.total === 0 ? (
          <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
            {!campaignId ? "No campaign selected" : "No sentiment data yet"}
          </div>
        ) : (
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
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[entry.name as keyof typeof COLORS]}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        )}

        <motion.div
          className="mt-4 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-2xl font-bold text-emerald-500">{positivePct}%</p>
          <p className="text-sm text-muted-foreground">Positive sentiment</p>
        </motion.div>
      </motion.div>
    </Card>
  );
}
