import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import { campaignService } from "@/services/campaign.service";
import { ScrapedData } from "@/types/campaign";

interface TrendingKeywordsProps {
  campaignId: number | null;
}

export function TrendingKeywords({ campaignId }: TrendingKeywordsProps) {
  const { isDark } = useTheme();
  const [words, setWords] = useState<{ text: string; weight: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!campaignId) {
      setWords([]);
      return;
    }
    setLoading(true);
    campaignService
      .getCampaignScrapedData(campaignId)
      .then((posts: ScrapedData[]) => {
        const counts: Record<string, number> = {};
        posts.forEach((post) => {
          post.analysis?.topics?.top_words?.forEach((word) => {
            counts[word] = (counts[word] || 0) + 1;
          });
        });
        const sorted = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 20);
        const max = sorted[0]?.[1] || 1;
        setWords(sorted.map(([text, count]) => ({
          text,
          weight: Math.round((count / max) * 100),
        })));
      })
      .catch(() => setWords([]))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const getSize = (weight: number) => 12 + (weight / 100) * 20;

  const getColor = (weight: number) =>
    isDark
      ? `hsl(${180 + weight}, 70%, 60%)`
      : `hsl(${200 + weight}, 80%, 45%)`;

  return (
    <Card className="p-6 h-96">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="h-full"
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Trending Topics</h3>
          <p className="text-sm text-muted-foreground">
            {campaignId
              ? "Most discussed words across analyzed posts"
              : "Select a campaign to view topics"}
          </p>
        </div>

        <div className="relative h-64 overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : words.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              {campaignId ? "No topic data yet" : "No campaign selected"}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center items-center h-full gap-2 p-4">
              {words.map((word, index) => (
                <motion.span
                  key={word.text}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  whileHover={{ scale: 1.15 }}
                  className="cursor-default font-medium select-none"
                  style={{
                    fontSize: `${getSize(word.weight)}px`,
                    color: getColor(word.weight),
                  }}
                >
                  {word.text}
                </motion.span>
              ))}
            </div>
          )}

          {/* Animated background */}
          <div className="absolute inset-0 -z-10">
            <motion.div
              animate={{
                background: isDark
                  ? ["radial-gradient(circle at 20% 80%, rgba(34,211,238,0.08) 0%, transparent 50%)",
                     "radial-gradient(circle at 80% 20%, rgba(99,102,241,0.08) 0%, transparent 50%)"]
                  : ["radial-gradient(circle at 20% 80%, rgba(59,130,246,0.08) 0%, transparent 50%)",
                     "radial-gradient(circle at 80% 20%, rgba(99,102,241,0.08) 0%, transparent 50%)"],
              }}
              transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
              className="w-full h-full"
            />
          </div>
        </div>
      </motion.div>
    </Card>
  );
}
