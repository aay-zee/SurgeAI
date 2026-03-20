import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import { useCampaign } from "@/components/providers/CampaignProvider";
import { campaignService } from "@/services/campaign.service";

export function TrendingKeywords() {
  const { isDark } = useTheme();
  const { selectedCampaignId } = useCampaign();
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCampaignId) {
      setLoading(false);
      return;
    }

    const fetchKeywordStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch both campaign keywords and search volume data
        const [campaign, searchVolumeData] = await Promise.all([
          campaignService.getCampaign(parseInt(selectedCampaignId)),
          campaignService.getSearchVolumeData(parseInt(selectedCampaignId)).catch(() => []),
        ]);

        if (campaign && campaign.keywords && campaign.keywords.length > 0) {
          // Build a map of keyword -> search volume data for real weights
          const svMap: Record<string, any> = {};
          if (searchVolumeData && searchVolumeData.length > 0) {
            const maxVolume = Math.max(...searchVolumeData.map((sv: any) => sv.monthly_volume || 0), 1);
            searchVolumeData.forEach((sv: any) => {
              svMap[sv.keyword?.toLowerCase()] = {
                weight: Math.round(((sv.monthly_volume || 0) / maxVolume) * 80) + 20,
                trend: sv.trend_direction === "rising" ? "up"
                  : sv.trend_direction === "falling" ? "down"
                  : "stable",
              };
            });
          }

          const keywordsList = campaign.keywords.map((kw: any) => {
            const sv = svMap[kw.keyword?.toLowerCase()];
            return {
              text: kw.keyword,
              weight: sv ? sv.weight : 50,
              trend: sv ? sv.trend : "stable",
            };
          });
          setKeywords(keywordsList);
        } else {
          setError("No keywords found");
          setKeywords([]);
        }
      } catch (err: any) {
        console.error("Failed to fetch keywords:", err);
        setError("Failed to load keywords");
        setKeywords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchKeywordStats();
  }, [selectedCampaignId]);

  const getKeywordSize = (weight: number) => {
    const minSize = 12;
    const maxSize = 32;
    return minSize + (weight / 100) * (maxSize - minSize);
  };

  const getKeywordColor = (weight: number, trend: string) => {
    if (isDark) {
      if (trend === "up") return `hsl(${180 + weight}, 70%, 60%)`;
      if (trend === "down") return `hsl(${weight / 2}, 60%, 50%)`;
      return `hsl(${220 + weight}, 50%, 55%)`;
    } else {
      if (trend === "up") return `hsl(${200 + weight}, 80%, 45%)`;
      if (trend === "down") return `hsl(${weight / 2}, 70%, 40%)`;
      return `hsl(${240 + weight}, 60%, 40%)`;
    }
  };

  if (loading) {
    return (
      <Card className="p-6 h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
          <p className="text-muted-foreground">Loading keywords...</p>
        </div>
      </Card>
    );
  }

  if (error || keywords.length === 0) {
    return (
      <Card className="p-6 h-96 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{error || "No keywords available"}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Keywords will appear after campaign scraping completes
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
        className="h-full"
      >
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Trending Keywords</h3>
          <p className="text-sm text-muted-foreground">
            Most mentioned keywords in your campaigns
          </p>
        </div>

        <div className="relative h-64 overflow-hidden">
          <div className="flex flex-wrap justify-center items-center h-full gap-2 p-4">
            {keywords.map((keyword, index) => (
              <motion.span
                key={keyword.text}
                initial={{ opacity: 0, scale: 0, rotate: Math.random() * 360 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  rotate: 0,
                }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.6,
                  
                }}
                whileHover={{
                  scale: 1.1,
                  filter: "brightness(1.2)",
                  textShadow: isDark
                    ? "0 0 10px rgba(34, 211, 238, 0.5)"
                    : "0 0 10px rgba(59, 130, 246, 0.5)",
                }}
                className="cursor-pointer font-medium transition-all duration-200 select-none"
                style={{
                  fontSize: `${getKeywordSize(keyword.weight)}px`,
                  color: getKeywordColor(keyword.weight, keyword.trend),
                  animation:
                    hoveredKeyword === keyword.text
                      ? "pulse 1s infinite"
                      : undefined,
                }}
                onMouseEnter={() => setHoveredKeyword(keyword.text)}
                onMouseLeave={() => setHoveredKeyword(null)}
              >
                {keyword.text}
              </motion.span>
            ))}
          </div>

          {/* Floating gradient background */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <motion.div
              animate={{
                background: isDark
                  ? [
                      "radial-gradient(circle at 20% 80%, rgba(34, 211, 238, 0.1) 0%, transparent 50%)",
                      "radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)",
                      "radial-gradient(circle at 40% 40%, rgba(34, 211, 238, 0.1) 0%, transparent 50%)",
                    ]
                  : [
                      "radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
                      "radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)",
                      "radial-gradient(circle at 40% 40%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
                    ],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
            <span className="text-xs text-muted-foreground">Trending Up</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span className="text-xs text-muted-foreground">Stable</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-xs text-muted-foreground">Trending Down</span>
          </div>
        </div>
      </motion.div>
    </Card>
  );
}
