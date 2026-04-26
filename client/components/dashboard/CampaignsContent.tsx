"use client";

import React, { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Rocket,
  Target,
  Type,
  Sparkles,
  Layers,
  Search as SearchIcon,
  Globe,
  BarChart2,
  Clock,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { campaignService } from "@/services/campaign.service";
import { Campaign, CampaignStatus } from "@/types/campaign";

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  scraping:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  failed:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  active:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused:    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function CampaignsContent() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const router = useRouter();

  useEffect(() => {
    campaignService.getCampaigns()
      .then(setCampaigns)
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !keywords.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
      const newCampaign = await campaignService.createCampaign({
        campaign_name: title,
        description: description,
        platforms: ["reddit", "hacker_news"] as any[],
        keywords: keywordList
      });

      toast.success("Campaign launched successfully! Agents are now scraping.");
      setTitle("");
      setDescription("");
      setKeywords("");
      setCampaigns(prev => [newCampaign, ...prev]);

      // Redirect to results page
      router.push(`/client/campaigns/${newCampaign.campaign_id}/results`);
      
    } catch (err: any) {
      if (err.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
        router.push("/login");
      } else {
        console.error(err);
        toast.error("Failed to create campaign.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(campaignId: number) {
    setDeletingId(campaignId);
    try {
      await campaignService.deleteCampaign(campaignId);
      setCampaigns(prev => prev.filter(c => c.campaign_id !== campaignId));
      toast.success("Campaign deleted.");
    } catch {
      toast.error("Failed to delete campaign.");
    } finally {
      setDeletingId(null);
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
      transition: { duration: 0.5 },
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
                    Separate keywords with commas. We'll search these across Reddit.
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
                    We fetch relevant posts and comments from Reddit matching your keywords.
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
                  <h4 className="font-medium text-sm">Insights</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Review AI-generated comment suggestions for high-intent posts.
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

      {/* ── Existing Campaigns ── */}
      {campaigns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-xl font-bold mb-4">Your Campaigns</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {campaigns.map((c) => (
              <Card key={c.campaign_id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{c.campaign_name}</CardTitle>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${STATUS_COLORS[c.status] ?? ""}`}>
                      {c.status}
                    </span>
                  </div>
                  {c.description && (
                    <CardDescription className="line-clamp-2">{c.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <Clock className="h-3 w-3" />
                    {new Date(c.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/client/campaigns/${c.campaign_id}/results`)}
                    >
                      <BarChart2 className="mr-2 h-4 w-4" />
                      View Results
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900"
                          disabled={deletingId === c.campaign_id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete <strong>{c.campaign_name}</strong> and all its scraped posts, NLP analysis, validation results, and intelligence data. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => handleDelete(c.campaign_id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
