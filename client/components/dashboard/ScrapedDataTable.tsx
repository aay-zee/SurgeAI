"use client";

import { ScrapedData } from "@/types/campaign";
import { Badge } from "@/components/ui/badge";
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

export function ScrapedDataTable({ posts }: ScrapedDataTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyzed Posts</CardTitle>
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
            {posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No posts found.
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
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
                    {post.url && (
                      <Link href={post.url} target="_blank" rel="noopener noreferrer">
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
