"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Bot, Copy, CheckCheck } from "lucide-react";
import { campaignService } from "@/services/campaign.service";
import { toast } from "sonner";

interface AIReportTabProps {
  campaignId: number;
}

export function AIReportTab({ campaignId }: AIReportTabProps) {
  const [report, setReport] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setReport(null);
      toast.info("Generating AI report... this may take 30–60 seconds.");
      const result = await campaignService.generateLLMReport(campaignId);
      setReport(result.report);
      setModelUsed(result.model_used);
      toast.success("AI report generated successfully!");
    } catch (error: any) {
      console.error("Failed to generate report:", error);
      toast.error(
        error.response?.data?.detail || "Failed to generate AI report. Try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report);
    setCopied(true);
    toast.success("Report copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // Render markdown-like sections with basic formatting
  const renderReport = (text: string) => {
    const sections = text.split(/(?=^## )/m);
    return sections.map((section, idx) => {
      const lines = section.trim().split("\n");
      const heading = lines[0];
      const body = lines.slice(1).join("\n").trim();

      if (heading.startsWith("## ")) {
        return (
          <div key={idx} className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-3 pb-1 border-b border-border">
              {heading.replace("## ", "")}
            </h3>
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {body}
            </div>
          </div>
        );
      }
      return (
        <div key={idx} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mb-4">
          {section}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-500" />
            AI Validation Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate a comprehensive report powered by{" "}
            <span className="font-medium text-purple-500">Mistral 7B</span>.
            The AI analyses all scraped data — user sentiment, pain points,
            competitor strengths &amp; weaknesses — and produces a detailed
            written assessment of your startup idea.
          </p>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {[
              "Executive Summary",
              "Shortcomings",
              "User Feedback",
              "Competitor Strengths",
              "Market Gaps",
              "Recommendations",
              "Final Verdict",
            ].map((label) => (
              <span
                key={label}
                className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20"
              >
                {label}
              </span>
            ))}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating report...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {report ? "Regenerate Report" : "Generate AI Report"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Loading state */}
      {generating && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
              <p className="font-medium">Mistral 7B is analysing your data...</p>
              <p className="text-sm text-muted-foreground">
                Reading sentiment data, themes, competitor reviews, and market signals.
                This typically takes 30–60 seconds.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report output */}
      {report && !generating && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Generated Report
              </CardTitle>
              <div className="flex items-center gap-3">
                {modelUsed && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {modelUsed}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <CheckCheck className="mr-1 h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="mr-1 h-3 w-3" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              {renderReport(report)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
