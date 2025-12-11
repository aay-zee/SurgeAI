"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { campaignService } from "@/services/campaign.service";
import { Campaign, ScrapedData, SentimentSummary } from "@/types/campaign";
import { SentimentChart } from "@/components/dashboard/SentimentChart";
import { ScrapedDataTable } from "@/components/dashboard/ScrapedDataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function CampaignResultsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = Number(params.campaign_id);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [posts, setPosts] = useState<ScrapedData[]>([]);
  const [summary, setSummary] = useState<SentimentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [campData, postsData, summaryData] = await Promise.all([
        campaignService.getCampaign(campaignId),
        campaignService.getCampaignScrapedData(campaignId),
        campaignService.getCampaignSentimentSummary(campaignId)
      ]);
      setCampaign(campData);
      setPosts(postsData);
      setSummary(summaryData);
    } catch (error) {
      console.error("Failed to fetch campaign results:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      fetchData();
    }
  }, [campaignId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return <div className="p-8 text-center">Loading campaign results...</div>;
  }

  if (!campaign) {
    return <div className="p-8 text-center text-red-500">Campaign not found.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{campaign.campaign_name}</h1>
            <p className="text-muted-foreground pb-2">Campaign Results & Analysis</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Sentiment Overview Card */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Sentiment Overview</CardTitle>
            <CardDescription>
              Distribution of sentiment across {summary?.total || 0} analyzed posts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary && <SentimentChart summary={summary} />}
          </CardContent>
        </Card>

        {/* Quick Stats Cards */}
        <div className="col-span-1 lg:col-span-2 grid gap-4 grid-cols-2 md:grid-cols-3">
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
                  <div className="text-2xl font-bold text-green-600">{summary?.counts.positive || 0}</div>
                  <p className="text-xs text-muted-foreground">{summary?.percentages.positive.toFixed(1)}%</p>
                </CardContent>
             </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Negative</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{summary?.counts.negative || 0}</div>
                  <p className="text-xs text-muted-foreground">{summary?.percentages.negative.toFixed(1)}%</p>
                </CardContent>
             </Card>
        </div>
      </div>

      {/* Main Data Table */}
      <ScrapedDataTable posts={posts} />
    </div>
  );
}
