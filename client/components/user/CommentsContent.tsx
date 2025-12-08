import React, { useState } from "react";
import { motion } from "motion/react";
import {
  MessageCircle,
  Search,
  Filter,
  ThumbsUp,
  ThumbsDown,
  Star,
  MoreHorizontal,
} from "lucide-react";
import { useTheme } from "../theme-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const commentsData = [
  {
    id: 1,
    author: "Sarah Johnson",
    avatar: "/avatars/sarah.jpg",
    content:
      "The AI marketing automation features are incredible! Our engagement rates have increased by 40% since implementing this platform.",
    sentiment: "positive",
    score: 0.92,
    platform: "Twitter",
    date: "2 hours ago",
    likes: 24,
    replies: 3,
    keywords: ["AI marketing", "automation", "engagement"],
  },
  {
    id: 2,
    author: "Mike Chen",
    avatar: "/avatars/mike.jpg",
    content:
      "Having some trouble with the sentiment analysis accuracy. It seems to miss context in some customer reviews.",
    sentiment: "negative",
    score: -0.65,
    platform: "LinkedIn",
    date: "4 hours ago",
    likes: 8,
    replies: 12,
    keywords: ["sentiment analysis", "accuracy", "reviews"],
  },
  {
    id: 3,
    author: "Emily Rodriguez",
    avatar: "/avatars/emily.jpg",
    content:
      "Love the new dashboard design! The widgets are so informative and the real-time analytics help us make quick decisions.",
    sentiment: "positive",
    score: 0.87,
    platform: "Facebook",
    date: "6 hours ago",
    likes: 45,
    replies: 7,
    keywords: ["dashboard", "widgets", "analytics"],
  },
  {
    id: 4,
    author: "David Park",
    avatar: "/avatars/david.jpg",
    content:
      "The keyword tracking could be more detailed. Would love to see historical data going back further than 6 months.",
    sentiment: "neutral",
    score: 0.15,
    platform: "Reddit",
    date: "8 hours ago",
    likes: 12,
    replies: 5,
    keywords: ["keyword tracking", "historical data"],
  },
  {
    id: 5,
    author: "Lisa Thompson",
    avatar: "/avatars/lisa.jpg",
    content:
      "Excellent customer support! The team helped us set up our campaigns and we saw immediate results. Highly recommend!",
    sentiment: "positive",
    score: 0.95,
    platform: "Twitter",
    date: "12 hours ago",
    likes: 67,
    replies: 15,
    keywords: ["customer support", "campaigns", "results"],
  },
];

export function CommentsContent() {
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");

  const filteredComments = commentsData.filter((comment) => {
    const matchesSearch =
      comment.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSentiment =
      sentimentFilter === "all" || comment.sentiment === sentimentFilter;
    return matchesSearch && matchesSentiment;
  });

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600 bg-green-100 dark:bg-green-900/20";
      case "negative":
        return "text-red-600 bg-red-100 dark:bg-red-900/20";
      default:
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <ThumbsUp className="w-4 h-4" />;
      case "negative":
        return <ThumbsDown className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
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
          Comments & Sentiment Analysis
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Monitor and analyze customer feedback across all platforms with
          AI-powered sentiment detection.
        </p>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search comments, authors, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={sentimentFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSentimentFilter("all")}
          >
            All
          </Button>
          <Button
            variant={sentimentFilter === "positive" ? "default" : "outline"}
            size="sm"
            onClick={() => setSentimentFilter("positive")}
          >
            <ThumbsUp className="w-4 h-4 mr-1" />
            Positive
          </Button>
          <Button
            variant={sentimentFilter === "negative" ? "default" : "outline"}
            size="sm"
            onClick={() => setSentimentFilter("negative")}
          >
            <ThumbsDown className="w-4 h-4 mr-1" />
            Negative
          </Button>
          <Button
            variant={sentimentFilter === "neutral" ? "default" : "outline"}
            size="sm"
            onClick={() => setSentimentFilter("neutral")}
          >
            Neutral
          </Button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {[
          {
            label: "Total Comments",
            value: "2,847",
            change: "+142 today",
            icon: MessageCircle,
            color: "blue",
          },
          {
            label: "Positive Sentiment",
            value: "72.3%",
            change: "+5.2% vs last week",
            icon: ThumbsUp,
            color: "green",
          },
          {
            label: "Avg. Sentiment Score",
            value: "0.68",
            change: "+0.12 improvement",
            icon: Star,
            color: "yellow",
          },
          {
            label: "Response Rate",
            value: "89.5%",
            change: "+3.1% this month",
            icon: MessageCircle,
            color: "purple",
          },
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {metric.label}
                      </p>
                      <p className="text-2xl font-bold mt-1">{metric.value}</p>
                      <p className="text-sm text-green-600 mt-1">
                        {metric.change}
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded-full ${
                        isDark ? "bg-slate-700" : "bg-gray-100"
                      }`}
                    >
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Comments List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Recent Comments</CardTitle>
            <CardDescription>
              Latest customer feedback with AI-powered sentiment analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredComments.map((comment, index) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                    isDark
                      ? "border-slate-700 hover:border-slate-600"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={comment.avatar} alt={comment.author} />
                      <AvatarFallback>
                        {comment.author
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{comment.author}</h4>
                          <Badge variant="outline" className="text-xs">
                            {comment.platform}
                          </Badge>
                          <Badge
                            className={`text-xs ${getSentimentColor(
                              comment.sentiment
                            )}`}
                          >
                            {getSentimentIcon(comment.sentiment)}
                            <span className="ml-1 capitalize">
                              {comment.sentiment}
                            </span>
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {comment.date}
                          </span>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="mt-2 text-gray-700 dark:text-gray-300">
                        {comment.content}
                      </p>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-500">
                            {comment.likes} likes • {comment.replies} replies
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {comment.keywords.map((keyword, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="text-xs"
                              >
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          Score: {comment.score > 0 ? "+" : ""}
                          {comment.score.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
