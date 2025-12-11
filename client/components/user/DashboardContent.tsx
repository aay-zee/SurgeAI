import React from "react";
import { motion } from "motion/react";
import { SentimentDistribution } from "../widgets/SentimentDistribution";
import { EngagementHeatmap } from "../widgets/EngagementHeatmap";
import { TrendingKeywords } from "../widgets/TrendingKeywords";
import { AIMarketingSuggestion } from "../widgets/AIMarketingSuggestion";

export function DashboardContent() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
          SurgeAI Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Welcome back! Here's what's happening with your AI-powered marketing
          analytics.
        </p>
      </motion.div>

      {/* Main Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        {/* Sentiment Distribution */}
        <motion.div variants={itemVariants} className="xl:col-span-1">
          <SentimentDistribution />
        </motion.div>

        {/* Engagement Heatmap */}
        <motion.div variants={itemVariants} className="xl:col-span-2">
          <EngagementHeatmap />
        </motion.div>

        {/* Trending Keywords */}
        <motion.div variants={itemVariants} className="xl:col-span-2">
          <TrendingKeywords />
        </motion.div>

        {/* AI Marketing Suggestion */}
        <motion.div variants={itemVariants} className="xl:col-span-1">
          <AIMarketingSuggestion />
        </motion.div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {[
          {
            label: "Total Campaigns",
            value: "24",
            change: "+12%",
            trend: "up",
          },
          {
            label: "Engagement Rate",
            value: "87.5%",
            change: "+5.2%",
            trend: "up",
          },
          {
            label: "Keywords Tracked",
            value: "1,247",
            change: "+89",
            trend: "up",
          },
          { label: "AI Suggestions", value: "156", change: "+23", trend: "up" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}
            className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all duration-200"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {stat.label}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stat.value}
              </p>
              <span className="text-sm text-green-600 font-medium">
                {stat.change}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
