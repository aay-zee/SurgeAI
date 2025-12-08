import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, TrendingUp } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const suggestions = [
  "Based on your engagement patterns, consider posting content between 2-4 PM for 23% higher reach. Your audience is most active during these hours.",
  "AI analysis suggests focusing on 'automation' and 'personalization' keywords - they show 45% higher conversion rates in your campaigns.",
  "Your positive sentiment is strong at 68%. Try A/B testing emotional storytelling in your next campaign to push it above 75%.",
  "Consider expanding your video content strategy. Video posts generate 3x more engagement than static content in your analytics.",
  "Your email marketing performance could improve by 31% with AI-optimized send times and personalized subject lines.",
];

export function AIMarketingSuggestion() {
  const { isDark } = useTheme();
  const [currentSuggestion, setCurrentSuggestion] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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

  return (
    <Card className="p-6 h-96 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-purple-500/10" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
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
            ease: "easeInOut",
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
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-12 left-8 w-3 h-3 bg-indigo-500 rounded-full"
        />
      </motion.div>
    </Card>
  );
}
