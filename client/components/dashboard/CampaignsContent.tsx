"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Rocket,
  Target,
  Type,
  Sparkles,
  Layers,
  Search as SearchIcon,
  MessageSquare,
  Globe,
} from "lucide-react";

export function CampaignsContent() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !keywords.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      // Simulation of API call
      await new Promise((r) => setTimeout(r, 1500));
      toast.success("Campaign launched successfully! Agents are now scraping.");
      setTitle("");
      setDescription("");
      setKeywords("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create campaign.");
    } finally {
      setLoading(false);
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Campaign Creation
          </h1>
          <p className="text-muted-foreground mt-2">
            Launch a new idea validation campaign and let AI find your
            customers.
          </p>
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Main Form Section */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-t-4 border-t-primary shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Rocket className="w-5 h-5 text-primary" />
                New Campaign Details
              </CardTitle>
              <CardDescription>
                Define your product idea and target keywords for our scraping
                engines.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    Campaign Title
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g., AI-Powered Resume Builder"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="flex items-center gap-2"
                  >
                    <Type className="w-4 h-4 text-muted-foreground" />
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your product's value proposition and target audience..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[140px] resize-none transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords" className="flex items-center gap-2">
                    <SearchIcon className="w-4 h-4 text-muted-foreground" />
                    Target Keywords
                  </Label>
                  <div className="relative">
                    <Input
                      id="keywords"
                      placeholder="resume help, job seeking, interview tips, career advice"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      className="h-11 pl-10 transition-all focus:ring-2 focus:ring-primary/20"
                    />
                    <Sparkles className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground ml-1">
                    Separate keywords with commas. We'll track these on Reddit,
                    X, and Quora.
                  </p>
                </div>

                <div className="pt-4 flex gap-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 text-base font-medium bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Launching Agents...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Rocket className="w-4 h-4" />
                        Launch Campaign
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info / Status Section */}
        <motion.div variants={itemVariants} className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                How it Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border shadow-sm shrink-0">
                  <span className="font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Scraping</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    We'll fetch relevant conversations from Reddit, X, and
                    Quora.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border shadow-sm shrink-0">
                  <span className="font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Analysis</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Our NLP models detect sentiment, pain points, and purchase
                    intent.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border shadow-sm shrink-0">
                  <span className="font-bold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Validation</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Verify demand and market fit using aggregated insights.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border shadow-sm shrink-0">
                  <span className="font-bold text-sm">4</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Engagement</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Review and post AI-drafted replies to potential customers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                Active Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-800">
                  Reddit Scraper
                </span>
                <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-200 dark:border-blue-800">
                  Sentiment NLP
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
