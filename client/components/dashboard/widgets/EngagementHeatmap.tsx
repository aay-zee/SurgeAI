import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import { useCampaign } from "@/components/providers/CampaignProvider";
import { campaignService } from "@/services/campaign.service";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = Array.from({ length: 24 }, (_, i) => i);

export function EngagementHeatmap() {
  const { isDark } = useTheme();
  const { selectedCampaignId } = useCampaign();
  const [hoveredCell, setHoveredCell] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCampaignId) {
      setLoading(false);
      return;
    }

    const fetchEngagementData = async () => {
      try {
        setLoading(true);
        setError(null);
        const scrapedData = await campaignService.getCampaignScrapedData(
          parseInt(selectedCampaignId)
        );

        if (scrapedData && scrapedData.length > 0) {
          // Build heatmap from actual post timestamps
          const cellCounts: Record<string, number> = {};
          scrapedData.forEach((post: any) => {
            if (post.scraped_at || post.timestamp) {
              const d = new Date(post.scraped_at || post.timestamp);
              const dayIdx = d.getDay(); // 0=Sun
              const mappedDay = days[(dayIdx + 6) % 7]; // shift so Mon=0
              const hour = d.getHours();
              const key = `${mappedDay}-${hour}`;
              cellCounts[key] = (cellCounts[key] || 0) + 1;
            }
          });

          const maxCount = Math.max(...Object.values(cellCounts), 1);
          const heatmapData = days
            .map((day) =>
              hours.map((hour) => {
                const key = `${day}-${hour}`;
                const count = cellCounts[key] || 0;
                return {
                  day,
                  hour,
                  value: Math.round((count / maxCount) * 100),
                };
              })
            )
            .flat();
          setData(heatmapData);
        } else {
          setError("No engagement data available");
          // Generate empty heatmap
          const emptyData = days
            .map((day) =>
              hours.map((hour) => ({
                day,
                hour,
                value: 0,
              }))
            )
            .flat();
          setData(emptyData);
        }
      } catch (err: any) {
        console.error("Failed to fetch engagement data:", err);
        setError("Failed to load engagement data");
        // Generate empty heatmap
        const emptyData = days
          .map((day) =>
            hours.map((hour) => ({
              day,
              hour,
              value: 0,
            }))
          )
          .flat();
        setData(emptyData);
      } finally {
        setLoading(false);
      }
    };

    fetchEngagementData();
  }, [selectedCampaignId]);

  const getIntensityColor = (value: number) => {
    const intensity = value / 100;
    if (isDark) {
      return `rgba(34, 211, 238, ${intensity})`;
    } else {
      return `rgba(59, 130, 246, ${intensity})`;
    }
  };

  const getGlowEffect = (value: number) => {
    const intensity = value / 100;
    return isDark
      ? `0 0 ${intensity * 8}px rgba(34, 211, 238, ${intensity * 0.8})`
      : `0 0 ${intensity * 8}px rgba(59, 130, 246, ${intensity * 0.8})`;
  };

  if (loading) {
    return (
      <Card className="p-6 h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
          <p className="text-muted-foreground">Loading engagement data...</p>
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
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Engagement Heatmap</h3>
          <p className="text-sm text-muted-foreground">
            User activity patterns by day and hour {error && `(${error})`}
          </p>
        </div>

        <div className="relative">
          {/* Hour labels */}
          <div className="flex mb-2 pl-10">
            {[0, 6, 12, 18].map((hour) => (
              <div
                key={hour}
                className="flex-1 text-xs text-muted-foreground text-center"
              >
                {hour}:00
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col justify-between pr-2 py-1">
              {days.map((day) => (
                <div
                  key={day}
                  className="text-xs text-muted-foreground h-8 flex items-center"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 grid grid-cols-24 gap-1">
              {data.map((cell, index) => (
                <motion.div
                  key={`${cell.day}-${cell.hour}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.002 }}
                  className="aspect-square rounded cursor-pointer transition-all duration-200"
                  style={{
                    backgroundColor: getIntensityColor(cell.value),
                    boxShadow:
                      hoveredCell === cell ? getGlowEffect(cell.value) : "none",
                  }}
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                  whileHover={{ scale: 1.2 }}
                />
              ))}
            </div>
          </div>

          {/* Tooltip */}
          {hoveredCell && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`absolute top-0 right-0 p-3 rounded-lg shadow-lg border z-10 ${
                isDark
                  ? "bg-slate-800 border-slate-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <p className="font-medium">
                {hoveredCell.day} {hoveredCell.hour}:00
              </p>
              <p className="text-sm text-muted-foreground">
                {hoveredCell.value}% engagement
              </p>
            </motion.div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-muted-foreground">Low</span>
            <div className="flex space-x-1">
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                <div
                  key={intensity}
                  className="w-3 h-3 rounded"
                  style={{
                    backgroundColor: getIntensityColor(intensity * 100),
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">High</span>
          </div>
        </div>
      </motion.div>
    </Card>
  );
}
