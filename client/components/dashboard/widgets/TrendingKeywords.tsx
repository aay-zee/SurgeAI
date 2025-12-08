import React, { useState } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";

const keywords = [
  { text: "AI Marketing", weight: 100, trend: "up" },
  { text: "Digital Transformation", weight: 85, trend: "up" },
  { text: "Customer Experience", weight: 78, trend: "stable" },
  { text: "Data Analytics", weight: 92, trend: "up" },
  { text: "Social Media", weight: 65, trend: "down" },
  { text: "Brand Awareness", weight: 70, trend: "up" },
  { text: "ROI Optimization", weight: 88, trend: "up" },
  { text: "Content Strategy", weight: 75, trend: "stable" },
  { text: "Lead Generation", weight: 82, trend: "up" },
  { text: "Email Marketing", weight: 58, trend: "down" },
  { text: "SEO", weight: 68, trend: "stable" },
  { text: "Automation", weight: 95, trend: "up" },
  { text: "Personalization", weight: 87, trend: "up" },
  { text: "Conversion Rate", weight: 79, trend: "up" },
  { text: "Machine Learning", weight: 91, trend: "up" },
];

export function TrendingKeywords() {
  const { isDark } = useTheme();
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null);

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

  return (
    <Card className="p-6 h-96">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
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
                  ease: "easeOut",
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
