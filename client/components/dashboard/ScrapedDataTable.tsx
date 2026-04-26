"use client";

import { useState } from "react";
import { ScrapedData } from "@/types/campaign";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface ScrapedDataTableProps {
  posts: ScrapedData[];
}

const PLATFORM_LABELS: Record<string, string> = {
  reddit: "Reddit",
  hacker_news: "Hacker News",
  google_play: "Google Play",
};

export function ScrapedDataTable({ posts }: ScrapedDataTableProps) {
  const [activePlatform, setActivePlatform] = useState<string>("all");

  // Compute per-platform counts for filter buttons
  const platformCounts = posts.reduce((acc, p) => {
    const key = p.platform?.toLowerCase() ?? "";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const availablePlatforms = Object.keys(platformCounts);

  const filtered =
    activePlatform === "all"
      ? posts
      : posts.filter((p) => p.platform?.toLowerCase() === activePlatform);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Analyzed Posts</CardTitle>
          {/* Platform filter buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={activePlatform === "all" ? "default" : "outline"}
              onClick={() => setActivePlatform("all")}
            >
              All ({posts.length})
            </Button>
            {availablePlatforms.map((platform) => (
              <Button
                key={platform}
                size="sm"
                variant={activePlatform === platform ? "default" : "outline"}
                onClick={() => setActivePlatform(platform)}
              >
                {PLATFORM_LABELS[platform] ?? platform} ({platformCounts[platform]})
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Sentiment</TableHead>
              <TableHead className="w-[80px]">Score</TableHead>
              <TableHead className="w-[150px]">Intent</TableHead>
              <TableHead>Content</TableHead>
              <TableHead className="w-[120px]">Platform</TableHead>
              <TableHead className="w-[150px]">Date</TableHead>
              <TableHead className="w-[50px]">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No posts found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((post) => (
                <TableRow key={post.data_id}>
                  <TableCell>
                    {post.analysis ? (
                      <Badge
                        variant={
                          post.analysis.sentiment_label === "positive" ? "default" :
                          post.analysis.sentiment_label === "negative" ? "destructive" :
                          "secondary"
                        }
                        className={
                           post.analysis.sentiment_label === "positive" ? "bg-green-500 hover:bg-green-600" : ""
                        }
                      >
                        {post.analysis.sentiment_label.toUpperCase()}
                      </Badge>
                    ) : (
                      <Badge variant="outline">PENDING</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {post.analysis ? (
                      <span className={
                        post.analysis.sentiment_score > 0 ? "text-green-600" : 
                        post.analysis.sentiment_score < 0 ? "text-red-600" : "text-muted-foreground"
                      }>
                        {post.analysis.sentiment_score.toFixed(2)}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {post.analysis?.intent ? (
                      <Badge variant="outline" className="text-xs capitalize whitespace-nowrap">
                        {post.analysis.intent}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[400px]">
                    <div className="truncate font-medium">{post.content}</div>
                  </TableCell>
                  <TableCell className="capitalize">{post.platform}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {post.scraped_at ? formatDistanceToNow(new Date(post.scraped_at), { addSuffix: true }) : "-"}
                  </TableCell>
                  <TableCell>
                    {post.post_url && (
                      <Link href={post.post_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 text-blue-500 hover:text-blue-700" />
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
