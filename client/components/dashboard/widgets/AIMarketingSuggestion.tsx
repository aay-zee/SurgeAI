import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, TrendingUp } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useCampaign } from "@/components/providers/CampaignProvider";
import { campaignService } from "@/services/campaign.service";

export function AIMarketingSuggestion() {
  const { isDark } = useTheme();
  const { selectedCampaignId } = useCampaign();
  const [currentSuggestion, setCurrentSuggestion] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Loading AI suggestions...",
  ]);
  const [loading, setLoading] = useState(true);

  // Fetch and generate suggestions based on campaign data
  useEffect(() => {
    if (!selectedCampaignId) {
      setLoading(false);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const sentiment = await campaignService.getCampaignSentimentSummary(
          parseInt(selectedCampaignId)
        );
        const scrapedData = await campaignService.getCampaignScrapedData(
          parseInt(selectedCampaignId)
        );

        const positivePercent = sentiment?.percentages?.positive || 0;
        const totalEngagement = scrapedData?.length || 0;

        const generatedSuggestions = [
          `Your campaign has ${totalEngagement} total data points collected. Focus on the highest-performing keywords to maximize ROI.`,
          `Positive sentiment is at ${positivePercent.toFixed(1)}%. ${positivePercent > 70 ? "Excellent! Continue your current strategy." : "There's room for improvement. Consider refining your messaging."}`,
          `With ${Math.max(1, Math.floor(totalEngagement / 100))} hundred+ data points, you have solid market validation. Scale your campaigns across more platforms.`,
          `Data shows consistent engagement patterns. Create targeted content for your top-performing keywords and audience segments.`,
          `Your campaign validation is underway. Review the sentiment distribution to identify customer pain points and opportunities.`,
        ];

        setSuggestions(generatedSuggestions);
      } catch (err) {
        console.error("Failed to generate suggestions:", err);
        setSuggestions([
          "AI suggestions will appear once data collection is complete.",
          "Your campaign is being analyzed for actionable insights.",
          "Check back soon for personalized marketing recommendations.",
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [selectedCampaignId]);

  const typewriterEffect = (text: string) => {
    setIsTyping(true);
    setDisplayedText("");

    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text[index]);
        index++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, 30);

    return () => clearInterval(timer);
  };

  useEffect(() => {
    typewriterEffect(suggestions[currentSuggestion]);
  }, [currentSuggestion]);

  const generateNewSuggestion = () => {
    setIsGenerating(true);

    setTimeout(() => {
      const nextSuggestion = (currentSuggestion + 1) % suggestions.length;
      setCurrentSuggestion(nextSuggestion);
      setIsGenerating(false);
    }, 1000);
  };

  if (loading) {
    return (
      <Card className="p-6 h-96 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-purple-500/10" />
        <div className="text-center relative z-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
          <p className="text-muted-foreground">Generating AI suggestions...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 h-96 relative overflow-hidden">
      {/* Gradient Background */}
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
              <h3 className="text-lg font-semibold">AI Marketing Suggestion</h3>
              <p className="text-sm text-muted-foreground">
                Powered by machine learning insights
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={generateNewSuggestion}
            disabled={isGenerating || isTyping}
            className="transition-all duration-200 hover:scale-105"
          >
            <motion.div
              animate={{ rotate: isGenerating ? 360 : 0 }}
              transition={{
                duration: 1,
                repeat: isGenerating ? Infinity : 0,
                ease: "linear",
              }}
            >
              <RefreshCw size={16} />
            </motion.div>
          </Button>
        </div>

        {/* Suggestion Content */}
        <div className="flex-1 flex flex-col justify-center">
          <div
            className={`p-6 rounded-2xl border-2 border-dashed transition-all duration-300 ${
              isDark
                ? "border-cyan-500/30 bg-slate-800/50"
                : "border-indigo-500/30 bg-white/50"
            }`}
          >
            <div className="min-h-[120px] flex items-center">
              <p className="text-base leading-relaxed">
                {displayedText}
                {isTyping && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      repeatType: "reverse",
                    }}
                    className="text-cyan-500"
                  >
                    |
                  </motion.span>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6">
            <Button
              className="flex-1 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 text-white transition-all duration-200 hover:scale-105"
              disabled={isTyping}
            >
              <TrendingUp size={16} className="mr-2" />
              Apply Suggestion
            </Button>

            <Button
              variant="outline"
              className="transition-all duration-200 hover:scale-105"
              disabled={isTyping}
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center space-x-2 mt-4">
          {suggestions.map((_, index) => (
            <motion.div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSuggestion
                  ? "w-8 bg-gradient-to-r from-cyan-500 to-indigo-500"
                  : "w-2 bg-muted"
              }`}
              whileHover={{ scale: 1.2 }}
            />
          ))}
        </div>

        {/* Floating elements */}
        <motion.div
          animate={{
            y: [0, -10, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            
          }}
          className="absolute top-8 right-8 w-2 h-2 bg-cyan-500 rounded-full"
        />

        <motion.div
          animate={{
            y: [0, -15, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            
            delay: 1,
          }}
          className="absolute bottom-12 left-8 w-3 h-3 bg-indigo-500 rounded-full"
        />
      </motion.div>
    </Card>
  );
}
