"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { campaignService } from "@/services/campaign.service";
import { ComprehensiveReport } from "@/types/campaign";
import { toast } from "sonner";
import { OverviewTab } from "./tabs/OverviewTab";
import { ValidationScoresTab } from "./tabs/ValidationScoresTab";
import { ThemesTab } from "./tabs/ThemesTab";
import { CompetitorTab } from "./tabs/CompetitorTab";
import { MarketSignalsTab } from "./tabs/MarketSignalsTab";
import { ConfidenceTab } from "./tabs/ConfidenceTab";
import { RawDataTab } from "./tabs/RawDataTab";
import { AIReportTab } from "./tabs/AIReportTab";

export function CampaignDashboard() {
  const router = useRouter();
  const params = useParams();
  const campaignId = Number(params.campaign_id);

  const [report, setReport] = useState<ComprehensiveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campaignId) {
      loadReport();
    }
  }, [campaignId]);

  const loadReport = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await campaignService.getComprehensiveReport(campaignId);
      setReport(data);
      toast.success("Report loaded successfully");
    } catch (error: any) {
      console.error("Failed to load report:", error);
      if (error.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
        router.push("/login");
      } else if (error.response?.status === 400) {
        setError(error.response.data?.detail || "Campaign report not ready. Please ensure scrapers have completed.");
        toast.error("Campaign report not ready");
      } else {
        setError("Failed to load campaign report. Please try again.");
        toast.error("Failed to load campaign report");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReport();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading campaign report...</p>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto space-y-4">
          <p className="text-red-500 font-medium">Error Loading Report</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button onClick={loadReport} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8">
        <p className="text-red-500">Failed to load campaign report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {report.campaign.campaign_name}
            </h1>
            <p className="text-muted-foreground text-sm">
              Keywords: {(report.campaign.keywords || []).join(", ")}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          size="sm"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
          <TabsTrigger value="confidence">Confidence</TabsTrigger>
          <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
          <TabsTrigger value="ai-report" className="text-purple-500 font-medium">
            ✦ AI Report
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <TabsContent value="overview" className="space-y-4 mt-6">
          <OverviewTab report={report} onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="scores" className="space-y-4 mt-6">
          <ValidationScoresTab
            scores={report.validation_scores}
            onCalculate={loadReport}
          />
        </TabsContent>

        <TabsContent value="themes" className="space-y-4 mt-6">
          <ThemesTab themes={report.themes} onExtract={loadReport} />
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4 mt-6">
          <CompetitorTab
            competitors={report.competitor_analysis}
            onExtract={loadReport}
          />
        </TabsContent>

        <TabsContent value="signals" className="space-y-4 mt-6">
          <MarketSignalsTab signals={report.market_signals} onAnalyze={loadReport} />
        </TabsContent>

        <TabsContent value="confidence" className="space-y-4 mt-6">
          <ConfidenceTab confidence={report.confidence} onRecalculate={loadReport} />
        </TabsContent>

        <TabsContent value="raw-data" className="space-y-4 mt-6">
          <RawDataTab
            data={{
              reddit: report.raw_data?.reddit || [],
              hacker_news: report.raw_data?.hacker_news || [],
              product_hunt: report.raw_data?.product_hunt || [],
              quora: report.raw_data?.quora || [],
              google_play: report.raw_data?.google_play || [],
              stack_exchange: report.raw_data?.stack_exchange || [],
            }}
            onRefresh={loadReport}
          />
        </TabsContent>

        <TabsContent value="ai-report" className="space-y-4 mt-6">
          <AIReportTab campaignId={campaignId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
