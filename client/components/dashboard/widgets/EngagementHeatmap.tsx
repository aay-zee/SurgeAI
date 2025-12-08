import React, { useState } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = Array.from({ length: 24 }, (_, i) => i);

// Generate engagement data (0-100)
const generateHeatmapData = () => {
  return days
    .map((day) =>
      hours.map((hour) => ({
        day,
        hour,
        value: Math.floor(Math.random() * 100),
      }))
    )
    .flat();
};

const data = generateHeatmapData();

export function EngagementHeatmap() {
  const { isDark } = useTheme();
  const [hoveredCell, setHoveredCell] = useState<any>(null);

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

  return (
    <Card className="p-6 h-96">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Engagement Heatmap</h3>
          <p className="text-sm text-muted-foreground">
            User activity patterns by day and hour
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
