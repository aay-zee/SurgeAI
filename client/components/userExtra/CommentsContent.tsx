"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Share2,
  Filter,
  MoreVertical,
  Clock,
  TrendingUp,
  TrendingDown,
  Smile,
  Meh,
  Frown,
  Search,
  Calendar,
  Tag,
  Star,
  Reply,
  Flag,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar } from "../ui/avatar";

const commentsData = [
  {
    id: 1,
    author: "Sarah Johnson",
    avatar: "SJ",
    content:
      "This AI marketing approach is revolutionary! Our conversion rates increased by 40% after implementing these strategies.",
    sentiment: "positive",
    platform: "LinkedIn",
    timestamp: "2 hours ago",
    likes: 24,
    replies: 3,
    engagement: "high",
  },
  {
    id: 2,
    author: "Mike Chen",
    avatar: "MC",
    content:
      "I have some concerns about data privacy with these AI tools. How do you ensure customer data protection?",
    sentiment: "neutral",
    platform: "Twitter",
    timestamp: "4 hours ago",
    likes: 12,
    replies: 8,
    engagement: "medium",
  },
  {
    id: 3,
    author: "Emily Rodriguez",
    avatar: "ER",
    content:
      "Absolutely love the personalization features! The AI suggestions for our email campaigns have been spot-on.",
    sentiment: "positive",
    platform: "Facebook",
    timestamp: "6 hours ago",
    likes: 31,
    replies: 5,
    engagement: "high",
  },
  {
    id: 4,
    author: "David Kim",
    avatar: "DK",
    content:
      "The interface could be more intuitive. Took us a while to figure out the analytics dashboard.",
    sentiment: "negative",
    platform: "Instagram",
    timestamp: "8 hours ago",
    likes: 7,
    replies: 2,
    engagement: "low",
  },
  {
    id: 5,
    author: "Lisa Wang",
    avatar: "LW",
    content:
      "Great integration with our existing CRM. The automation features saved us countless hours of manual work.",
    sentiment: "positive",
    platform: "LinkedIn",
    timestamp: "12 hours ago",
    likes: 18,
    replies: 4,
    engagement: "medium",
  },
  {
    id: 6,
    author: "Alex Thompson",
    avatar: "AT",
    content:
      "Would like to see more customization options for the reporting features. Otherwise, solid platform!",
    sentiment: "neutral",
    platform: "Twitter",
    timestamp: "1 day ago",
    likes: 9,
    replies: 1,
    engagement: "low",
  },
];

const sentimentStats = {
  positive: { count: 3, percentage: 50 },
  neutral: { count: 2, percentage: 33 },
  negative: { count: 1, percentage: 17 },
};

export function CommentsContent() {
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedSentiment, setSelectedSentiment] = useState("all");

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

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-emerald-500/20 text-emerald-600 border-emerald-500/30";
      case "negative":
        return "bg-red-500/20 text-red-600 border-red-500/30";
      default:
        return "bg-amber-500/20 text-amber-600 border-amber-500/30";
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case "LinkedIn":
        return "bg-blue-500/20 text-blue-600 border-blue-500/30";
      case "Twitter":
        return "bg-sky-500/20 text-sky-600 border-sky-500/30";
      case "Facebook":
        return "bg-indigo-500/20 text-indigo-600 border-indigo-500/30";
      case "Instagram":
        return "bg-pink-500/20 text-pink-600 border-pink-500/30";
      default:
        return "bg-gray-500/20 text-gray-600 border-gray-500/30";
    }
  };

  const getEngagementIcon = (engagement: string) => {
    if (engagement === "high")
      return <Star size={16} className="text-yellow-500" />;
    if (engagement === "medium")
      return <ThumbsUp size={16} className="text-blue-500" />;
    return <ThumbsDown size={16} className="text-gray-500" />;
  };

  const filteredComments = commentsData.filter(
    (comment) =>
      comment.content.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedFilter === "all" ||
        comment.platform.toLowerCase() === selectedFilter) &&
      (selectedSentiment === "all" || comment.sentiment === selectedSentiment)
  );

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
            Monitor and analyze customer feedback across all platforms
          </p>
        </motion.div>

        {/* Sentiment Overview */}
        <motion.div variants={itemVariants} className="mb-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Sentiment Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(sentimentStats).map(([sentiment, stats]) => (
                <motion.div
                  key={sentiment}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`p-4 rounded-xl border transition-all duration-200 hover:scale-105 ${
                    isDark
                      ? "bg-slate-800/50 border-slate-700"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium capitalize">{sentiment}</h4>
                    <Badge
                      variant="outline"
                      className={getSentimentColor(sentiment)}
                    >
                      {stats.percentage}%
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">{stats.count}</p>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.percentage}%` }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                      className={`h-2 rounded-full ${
                        sentiment === "positive"
                          ? "bg-emerald-500"
                          : sentiment === "negative"
                          ? "bg-red-500"
                          : "bg-amber-500"
                      }`}
                    />
                  </div>
                </motion.div>
              ))}
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
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">Twitter</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
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

                <Button variant="outline" size="sm">
                  <Filter size={16} className="mr-2" />
                  More Filters
                </Button>
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
              <Button
                size="sm"
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 text-white"
              >
                <MessageSquare size={16} className="mr-2" />
                Bulk Actions
              </Button>
            </div>

            <div className="space-y-4">
              {filteredComments.map((comment, index) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-6 rounded-xl border transition-all duration-200 hover:shadow-md ${
                    isDark
                      ? "bg-slate-800/50 border-slate-700"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <Avatar className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-indigo-500">
                      <span className="text-white text-sm font-medium">
                        {comment.avatar}
                      </span>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium">{comment.author}</h4>
                          <Badge
                            variant="outline"
                            className={getPlatformColor(comment.platform)}
                          >
                            {comment.platform}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={getSentimentColor(comment.sentiment)}
                          >
                            {comment.sentiment}
                          </Badge>
                          {getEngagementIcon(comment.engagement)}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">
                            {comment.timestamp}
                          </span>
                          <Button variant="ghost" size="sm">
                            <MoreVertical size={16} />
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm mb-4 leading-relaxed">
                        {comment.content}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Heart size={16} className="text-red-500" />
                            <span className="text-sm">{comment.likes}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Reply
                              size={16}
                              className="text-muted-foreground"
                            />
                            <span className="text-sm">{comment.replies}</span>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Reply size={14} className="mr-1" />
                            Reply
                          </Button>
                          <Button variant="outline" size="sm">
                            <Flag size={14} className="mr-1" />
                            Flag
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
