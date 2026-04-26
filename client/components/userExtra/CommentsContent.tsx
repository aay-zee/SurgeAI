"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Search,
  Filter,
  MoreVertical,
  Reply,
  Flag,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar } from "../ui/avatar";
import { useCampaign } from "@/components/providers/CampaignProvider";
import { campaignService } from "@/services/campaign.service";
import { ScrapedData } from "@/types/campaign";
import { formatDistanceToNow } from "date-fns";

export function CommentsContent() {
  const { isDark } = useTheme();
  const { selectedCampaignId } = useCampaign();
  const [comments, setComments] = useState<ScrapedData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedSentiment, setSelectedSentiment] = useState("all");

  useEffect(() => {
    async function fetchComments() {
      if (!selectedCampaignId) return;
      
      setLoading(true);
      try {
        const data = await campaignService.getCampaignScrapedData(Number(selectedCampaignId));
        setComments(data);
      } catch (error) {
        console.error("Failed to fetch comments:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, [selectedCampaignId]);

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

  const getSentimentColor = (sentiment: string = "neutral") => {
    switch (sentiment.toLowerCase()) {
      case "positive":
        return "bg-emerald-500/20 text-emerald-600 border-emerald-500/30";
      case "negative":
        return "bg-red-500/20 text-red-600 border-red-500/30";
      default:
        return "bg-amber-500/20 text-amber-600 border-amber-500/30";
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "linkedin":
        return "bg-blue-500/20 text-blue-600 border-blue-500/30";
      case "twitter":
        return "bg-sky-500/20 text-sky-600 border-sky-500/30";
      case "facebook":
        return "bg-indigo-500/20 text-indigo-600 border-indigo-500/30";
      case "instagram":
        return "bg-pink-500/20 text-pink-600 border-pink-500/30";
      case "reddit":
        return "bg-orange-500/20 text-orange-600 border-orange-500/30";
      default:
        return "bg-gray-500/20 text-gray-600 border-gray-500/30";
    }
  };

  // Safe helper to extract sentiment from potentially complex backend object or fallback
  const getCommentSentiment = (comment: any) => {
      // Backend returns 'analysis' object with 'sentiment_label'
      return comment.analysis?.sentiment_label || "neutral";
  };

  const filteredComments = comments.filter(
    (comment) =>
      (comment.content || "").toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedFilter === "all" ||
        comment.platform.toLowerCase() === selectedFilter.toLowerCase()) &&
      (selectedSentiment === "all" || getCommentSentiment(comment).toLowerCase() === selectedSentiment.toLowerCase())
  );

  // Calculate generic stats based on loaded data
  const calculateStats = () => {
      const total = comments.length;
      if (total === 0) return { positive: 0, neutral: 0, negative: 0 };
      
      const counts = comments.reduce((acc, curr) => {
          const sent = getCommentSentiment(curr).toLowerCase();
          acc[sent] = (acc[sent] || 0) + 1;
          return acc;
      }, {} as any);

      return {
          positive: Math.round(((counts.positive || 0) / total) * 100),
          neutral: Math.round(((counts.neutral || 0) / total) * 100),
          negative: Math.round(((counts.negative || 0) / total) * 100),
          counts
      };
  };

  const stats = calculateStats();

  if (loading) {
      return <div className="p-8 text-center">Loading comments...</div>;
  }

  if (!selectedCampaignId) {
      return <div className="p-8 text-center text-muted-foreground">Please select a campaign to view comments.</div>;
  }

  return (
    <div className="p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Social Comments</h1>
          <p className="text-muted-foreground">
            Monitor and analyze customer feedback for Campaign #{selectedCampaignId}
          </p>
        </motion.div>

        {/* Sentiment Overview */}
        <motion.div variants={itemVariants} className="mb-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Sentiment Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* Positive */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`p-4 rounded-xl border transition-all duration-200 hover:scale-105 ${
                    isDark ? "bg-slate-800/50 border-slate-700" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium capitalize">Positive</h4>
                    <Badge variant="outline" className={getSentimentColor("positive")}>
                      {stats.positive}%
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">{stats.counts?.positive || 0}</p>
                   <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.positive}%` }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                      className="h-2 rounded-full bg-emerald-500"
                    />
                  </div>
                </motion.div>

                {/* Neutral */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className={`p-4 rounded-xl border transition-all duration-200 hover:scale-105 ${
                    isDark ? "bg-slate-800/50 border-slate-700" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium capitalize">Neutral</h4>
                    <Badge variant="outline" className={getSentimentColor("neutral")}>
                      {stats.neutral}%
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">{stats.counts?.neutral || 0}</p>
                   <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.neutral}%` }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                      className="h-2 rounded-full bg-amber-500"
                    />
                  </div>
                </motion.div>

                 {/* Negative */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className={`p-4 rounded-xl border transition-all duration-200 hover:scale-105 ${
                    isDark ? "bg-slate-800/50 border-slate-700" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium capitalize">Negative</h4>
                    <Badge variant="outline" className={getSentimentColor("negative")}>
                      {stats.negative}%
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">{stats.counts?.negative || 0}</p>
                   <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.negative}%` }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                      className="h-2 rounded-full bg-red-500"
                    />
                  </div>
                </motion.div>
            </div>
          </Card>
        </motion.div>

        {/* Search and Filters */}
        <motion.div variants={itemVariants} className="mb-6">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search
                  size={20}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Search comments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-white border-gray-200 text-gray-900"
                  }`}
                >
                  <option value="all">All Platforms</option>
                  <option value="reddit">Reddit</option>
                  <option value="twitter">Twitter</option>
                  <option value="linkedin">LinkedIn</option>
                </select>

                <select
                  value={selectedSentiment}
                  onChange={(e) => setSelectedSentiment(e.target.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-white border-gray-200 text-gray-900"
                  }`}
                >
                  <option value="all">All Sentiments</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Comments List */}
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                Recent Comments ({filteredComments.length})
              </h3>
            </div>

            <div className="space-y-4">
              {filteredComments.length === 0 ? (
                 <div className="text-center text-muted-foreground py-8">No comments found matching filters.</div>
              ) : (
                filteredComments.map((comment, index) => (
                    <motion.div
                    key={comment.data_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-6 rounded-xl border transition-all duration-200 hover:shadow-md ${
                        isDark
                        ? "bg-slate-800/50 border-slate-700"
                        : "bg-gray-50 border-gray-200"
                    }`}
                    >
                    <div className="flex items-start space-x-4">
                        <Avatar className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-indigo-500">
                        <span className="text-white text-sm font-medium">
                            {((comment as any).author || "A")[0].toUpperCase()}
                        </span>
                        </Avatar>

                        <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                            <h4 className="font-medium">{(comment as any).author || "Anonymous"}</h4>
                            <Badge
                                variant="outline"
                                className={getPlatformColor(comment.platform)}
                            >
                                {comment.platform}
                            </Badge>
                            <Badge
                                variant="outline"
                                className={getSentimentColor(getCommentSentiment(comment))}
                            >
                                {getCommentSentiment(comment)}
                            </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">
                                {comment.scraped_at ? formatDistanceToNow(new Date(comment.scraped_at), { addSuffix: true }) : "Recently"}
                            </span>
                            </div>
                        </div>

                        <p className="text-sm mb-4 leading-relaxed">
                            {comment.content}
                        </p>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                                <Heart size={16} className="text-red-500" />
                                <span className="text-sm">{(comment as any).engagement_score || 0}</span>
                            </div>
                            </div>
                            
                             <div className="flex space-x-2">
                                {(comment.url || (comment as any).post_url) && (
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={comment.url || (comment as any).post_url} target="_blank" rel="noopener noreferrer">
                                            View Original
                                        </a>
                                    </Button>
                                )}
                             </div>
                        </div>
                        </div>
                    </div>
                    </motion.div>
                ))
              )}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
