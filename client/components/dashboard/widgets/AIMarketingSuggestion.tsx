import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { campaignService } from "@/services/campaign.service";
import { ValidationResult, SentimentSummary, ScrapedData } from "@/types/campaign";

interface AIMarketingSuggestionProps {
  campaignId: number | null;
}

function buildInsights(
  validation: ValidationResult | null,
  summary: SentimentSummary | null,
  posts: ScrapedData[]
): string[] {
  if (!validation || !summary) {
    return [
      "Create a campaign and run the analysis pipeline to receive AI-generated insights specific to your product idea.",
      "SurgeAI scrapes Reddit for real discussions about your keywords, then uses NLP to detect sentiment, pain points, and buying intent.",
      "Your idea validation score (0–100) reflects both positive sentiment ratio and volume of discussion around your product space.",
    ];
  }

  const score = validation.demand_score ?? 0;
  const intentCounts: Record<string, number> = {};
  posts.forEach((p) => {
    if (p.analysis?.intent) intentCounts[p.analysis.intent] = (intentCounts[p.analysis.intent] || 0) + 1;
  });
  const topIntentEntry = Object.entries(intentCounts).sort(([, a], [, b]) => b - a)[0];
  const totalIntentPosts = Object.values(intentCounts).reduce((a, b) => a + b, 0);
  const topIntentPct = topIntentEntry && totalIntentPosts > 0
    ? Math.round((topIntentEntry[1] / totalIntentPosts) * 100)
    : 0;

  const insights: string[] = [];

  if (score >= 70) {
    insights.push(
      `Strong demand detected (${score}/100). Reddit users are actively discussing your problem space with ${summary.percentages.positive.toFixed(0)}% positive sentiment. This is a green light to build an MVP.`
    );
  } else if (score >= 40) {
    insights.push(
      `Moderate demand signal (${score}/100). Interest exists but is not overwhelming. Refine your value proposition and focus on the ${validation.negative_mentions} posts with negative sentiment — they reveal what the market is missing.`
    );
  } else {
    insights.push(
      `Weak demand signal (${score}/100). Only ${validation.positive_mentions} of ${summary.total} posts show genuine interest. Consider narrowing your niche or pivoting before investing further.`
    );
  }

  if (topIntentEntry) {
    const [intent] = topIntentEntry;
    if (intent === "pain point") {
      insights.push(
        `${topIntentPct}% of Reddit users express pain points matching your keywords. This confirms a real, felt problem — position your product as the direct solution in your messaging.`
      );
    } else if (intent === "buying intent") {
      insights.push(
        `${topIntentPct}% of posts show buying intent — users are actively searching for a solution like yours. These are high-value leads worth targeting first.`
      );
    } else if (intent === "feature request") {
      insights.push(
        `${topIntentPct}% of posts are feature requests — users know what they want but existing tools don't deliver. Use these posts to define your MVP feature set.`
      );
    } else {
      insights.push(
        `The dominant intent is "${intent}" (${topIntentPct}% of posts). Use the Comments page to review specific posts and tailor your outreach messaging accordingly.`
      );
    }
  }

  insights.push(
    `${validation.neutral_mentions} neutral posts were found. These represent undecided users — a targeted, problem-aware message could convert them into early adopters.`
  );

  return insights;
}

export function AIMarketingSuggestion({ campaignId }: AIMarketingSuggestionProps) {
  const { isDark } = useTheme();
  const [index, setIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    if (!campaignId) {
      setInsights(buildInsights(null, null, []));
      setIndex(0);
      return;
    }
    Promise.all([
      campaignService.getValidationResult(campaignId).catch(() => null),
      campaignService.getCampaignSentimentSummary(campaignId).catch(() => null),
      campaignService.getCampaignScrapedData(campaignId).catch(() => []),
    ]).then(([validation, summary, posts]) => {
      setInsights(buildInsights(validation, summary, posts));
      setIndex(0);
    });
  }, [campaignId]);

  useEffect(() => {
    if (insights.length === 0) return;
    const text = insights[index];
    setIsTyping(true);
    setDisplayedText("");
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text[i]);
        i++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, 18);
    return () => clearInterval(timer);
  }, [index, insights]);

  const next = () => {
    if (!isTyping && insights.length > 0) setIndex((prev) => (prev + 1) % insights.length);
  };

  return (
    <Card className="p-6 h-96 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-purple-500/10" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative h-full flex flex-col"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI Insight</h3>
              <p className="text-sm text-muted-foreground">
                {campaignId ? "Based on your campaign data" : "Select a campaign"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={next} disabled={isTyping}>
            <RefreshCw size={16} />
          </Button>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className={`p-6 rounded-2xl border-2 border-dashed transition-all duration-300 ${
            isDark ? "border-cyan-500/30 bg-slate-800/50" : "border-indigo-500/30 bg-white/50"
          }`}>
            <div className="min-h-[120px] flex items-start">
              <p className="text-base leading-relaxed">
                {displayedText}
                {isTyping && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
                    className="text-cyan-500"
                  >
                    |
                  </motion.span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center space-x-2 mt-4">
          {insights.map((_, i) => (
            <motion.div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index
                  ? "w-8 bg-gradient-to-r from-cyan-500 to-indigo-500"
                  : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        <motion.div
          animate={{ y: [0, -10, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute top-8 right-8 w-2 h-2 bg-cyan-500 rounded-full"
        />
        <motion.div
          animate={{ y: [0, -15, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1 }}
          className="absolute bottom-12 left-8 w-3 h-3 bg-indigo-500 rounded-full"
        />
      </motion.div>
    </Card>
  );
}
