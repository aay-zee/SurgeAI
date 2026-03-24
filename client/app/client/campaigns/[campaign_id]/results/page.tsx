"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { campaignService } from "@/services/campaign.service";
import { Campaign, ScrapedData, SentimentSummary, ValidationResult } from "@/types/campaign";
import { SentimentChart } from "@/components/dashboard/SentimentChart";
import { ScrapedDataTable } from "@/components/dashboard/ScrapedDataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";

const INTENT_COLORS: Record<string, string> = {
  "buying intent":     "bg-green-500",
  "pain point":        "bg-orange-500",
  "feature request":   "bg-blue-500",
  "positive feedback": "bg-emerald-400",
  "general discussion":"bg-slate-400",
};

function ValidationScoreCard({ validation }: { validation: ValidationResult }) {
  const score = validation.demand_score ?? 0;
  const scoreColor =
    score >= 70 ? "text-green-500" :
    score >= 40 ? "text-yellow-500" :
    "text-red-500";
  const borderColor =
    score >= 70 ? "border-green-500/30 bg-green-500/5" :
    score >= 40 ? "border-yellow-500/30 bg-yellow-500/5" :
    "border-red-500/30 bg-red-500/5";
  const verdict =
    score >= 70 ? "Strong Demand Signal" :
    score >= 40 ? "Moderate Demand Signal" :
    "Weak Demand Signal";

  return (
    <Card className={`border-2 ${borderColor}`}>
      <CardHeader>
        <CardTitle className="text-lg">Idea Validation Score</CardTitle>
        <CardDescription>
          Computed from {validation.positive_mentions + validation.negative_mentions + validation.neutral_mentions} analyzed Reddit posts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex items-end gap-1 shrink-0">
            <span className={`text-7xl font-bold leading-none ${scoreColor}`}>
              {score.toFixed(0)}
            </span>
            <span className="text-2xl text-muted-foreground mb-1">/100</span>
          </div>
          <div className="space-y-2">
            <p className={`text-lg font-semibold ${scoreColor}`}>{verdict}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {validation.summary}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IntentBreakdown({ posts }: { posts: ScrapedData[] }) {
  const intentCounts = posts.reduce((acc, post) => {
    const intent = post.analysis?.intent;
    if (intent) acc[intent] = (acc[intent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = Object.values(intentCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const breakdown = Object.entries(intentCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([intent, count]) => ({
      intent,
      count,
      pct: Math.round((count / total) * 100),
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">User Intent Breakdown</CardTitle>
        <CardDescription>
          What are people actually talking about? ({total} posts with detected intent)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {breakdown.map(({ intent, count, pct }) => (
          <div key={intent} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="capitalize font-medium">{intent}</span>
              <span className="text-muted-foreground">{count} posts · {pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${INTENT_COLORS[intent] ?? "bg-slate-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ProcessingBanner({ status }: { status: string }) {
  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardContent className="flex items-center gap-3 py-4">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500 shrink-0" />
        <div>
          <p className="font-medium text-blue-600 dark:text-blue-400">
            Campaign is {status === "scraping" ? "scraping Reddit posts" : "queued for processing"}…
          </p>
          <p className="text-sm text-muted-foreground">
            This page will update automatically every 5 seconds.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CampaignResultsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = Number(params.campaign_id);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [posts, setPosts] = useState<ScrapedData[]>([]);
  const [summary, setSummary] = useState<SentimentSummary | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [campData, postsData, summaryData] = await Promise.all([
        campaignService.getCampaign(campaignId),
        campaignService.getCampaignScrapedData(campaignId),
        campaignService.getCampaignSentimentSummary(campaignId),
      ]);
      setCampaign(campData);
      setPosts(postsData);
      setSummary(summaryData);

      // Validation result may not exist yet — treat 404 as "not ready"
      try {
        const validationData = await campaignService.getValidationResult(campaignId);
        setValidation(validationData);
      } catch {
        setValidation(null);
      }
    } catch (error) {
      console.error("Failed to fetch campaign results:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaignId]);

  // Initial load
  useEffect(() => {
    if (campaignId) fetchData();
  }, [campaignId, fetchData]);

  // Auto-poll every 5 seconds while campaign is still processing
  useEffect(() => {
    if (!campaign) return;
    if (campaign.status !== "pending" && campaign.status !== "scraping") return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [campaign?.status, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading campaign results…
      </div>
    );
  }

  if (!campaign) {
    return <div className="p-8 text-center text-red-500">Campaign not found.</div>;
  }

  const isProcessing = campaign.status === "pending" || campaign.status === "scraping";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{campaign.campaign_name}</h1>
            <p className="text-muted-foreground pb-2">
              Campaign Results & Analysis ·{" "}
              <span className="capitalize font-medium">{campaign.status}</span>
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Processing banner */}
      {isProcessing && <ProcessingBanner status={campaign.status} />}

      {/* Validation Score — top of page, full width */}
      {validation && <ValidationScoreCard validation={validation} />}

      {/* Sentiment chart + quick stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Sentiment Overview</CardTitle>
            <CardDescription>
              Distribution across {summary?.total || 0} analyzed posts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary && <SentimentChart summary={summary} />}
          </CardContent>
        </Card>

        <div className="col-span-1 lg:col-span-2 grid gap-4 grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Positive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary?.counts.positive || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary?.percentages.positive.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Neutral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-500">
                {summary?.counts.neutral || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary?.percentages.neutral.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Negative</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summary?.counts.negative || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary?.percentages.negative.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Intent breakdown */}
      <IntentBreakdown posts={posts} />

      {/* Posts table */}
      <ScrapedDataTable posts={posts} />
    </div>
  );
}
