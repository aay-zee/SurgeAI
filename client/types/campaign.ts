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
  QUORA = "quora",
  HACKER_NEWS = "hacker_news",
  GOOGLE_PLAY = "google_play"
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
  post_url: string;
  platform: string;
  author?: string;
  engagement_score?: number;
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

// ─────────────────── Intelligence Layer Types ───────────────────

export interface ValidationScoreDimension {
  score: number;
  reason: string;
}

export interface ValidationScores {
  market_size: ValidationScoreDimension;
  demand: ValidationScoreDimension;
  problem_clarity: ValidationScoreDimension;
  competitor_gap: ValidationScoreDimension;
  technical_feasibility: ValidationScoreDimension;
  market_growth: ValidationScoreDimension;
  pain_point_severity: ValidationScoreDimension;
  monetization_potential: ValidationScoreDimension;
  overall_score: number;
}

export interface Theme {
  frequency: number;
  severity?: "high" | "medium" | "low";
  sentiment?: number;
  sources?: string[];
  quotes: string[];
  description?: string;
}

export type Themes = Record<string, Theme>;

export interface CompetitorApp {
  developer?: string;
  rating: number;
  review_count?: number;
  // LLM returns simple string arrays; legacy rule-based scorer uses Record format
  weaknesses: string[] | Record<string, { frequency: number; quotes: string[] }>;
  strengths: string[] | Record<string, { frequency: number; quotes: string[] }>;
  gaps?: string[];
  user_sentiment?: string;
  top_positive_quote?: string;
  top_negative_quote?: string;
}

export type CompetitorAnalysis = Record<string, CompetitorApp>;

export interface ConfidenceScore {
  confidence_score: number;
  confidence_percentage: string;
  factors: Record<string, { score: number; reason: string; [key: string]: any }>;
  warnings: string[];
}

export interface MarketSignals {
  // Derived from real scraped data — no external API required
  discussion_volume?: number | null;       // total posts (search interest proxy)
  trend_direction?: string | null;         // from Google Trends data
  buying_intent_pct?: number | null;       // % posts with buying intent (monetization proxy)
  competitor_saturation?: string | null;   // low/medium/high from Google Play reviews
  has_trends_data?: boolean;
  has_gplay_data?: boolean;
  // Legacy fields kept for compatibility
  monthly_search_volume?: number | null;
  search_competition?: string | null;
  estimated_cpc?: number | null;
}

export interface ComprehensiveReport {
  campaign_id: number;
  validation_scores?: ValidationScores;
  themes?: Themes;
  competitor_analysis?: CompetitorAnalysis;
  confidence?: ConfidenceScore;
  report_text?: string;
  model_used?: string;
  campaign?: { keywords?: string[]; created_at?: string; campaign_name?: string; description?: string; [key: string]: any };
  data_summary?: { total_data_points?: number; [key: string]: any };
  market_signals?: MarketSignals;
}
