export enum CampaignStatus {
  PENDING = "pending",
  SCRAPING = "scraping",
  COMPLETED = "completed",
  FAILED = "failed",
  ACTIVE = "active",
  PAUSED = "paused"
}

export enum Platform {
  REDDIT = "reddit",
  TWITTER = "twitter",
  QUORA = "quora"
}

export interface Campaign {
  campaign_id: number;
  campaign_name: string;
  description?: string;
  platforms: string[];
  status: CampaignStatus;
  created_at: string;
  user_id: number;
}

export interface CampaignCreate {
  campaign_name: string;
  description?: string;
  platforms: Platform[];
  keywords: string[];
}

export interface NLPAnalysis {
  analysis_id: number;
  data_id: number;
  sentiment_score: number;
  sentiment_label: string;
  intent: string | null;
  topics: { top_words: string[] } | null;
  analyzed_at: string;
}

export interface ValidationResult {
  validation_id: number;
  campaign_id: number;
  demand_score: number | null;
  sentiment_aggregate: number | null;
  positive_mentions: number;
  negative_mentions: number;
  neutral_mentions: number;
  summary: string | null;
  generated_at: string;
}

export interface ScrapedData {
  data_id: number;
  campaign_id: number;
  post_id: string;
  content: string;
  url: string;
  platform: string;
  scraped_at: string;
  analysis?: NLPAnalysis;
}

export interface SentimentSummary {
  counts: {
    positive: number;
    neutral: number;
    negative: number;
    [key: string]: number;
  };
  percentages: {
    positive: number;
    neutral: number;
    negative: number;
    [key: string]: number;
  };
  total: number;
}
