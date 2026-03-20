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
  HACKER_NEWS = "hacker_news",
  PRODUCT_HUNT = "product_hunt",
  QUORA = "quora",
  GOOGLE_PLAY = "google_play",
  STACK_EXCHANGE = "stack_exchange",
  SEARCH_VOLUME = "search_volume"
}

export interface Campaign {
  campaign_id: number;
  campaign_name: string;
  description?: string;
  platforms: string[];
  keywords: string[];
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
  analyzed_at: string;
}

export interface ScrapedData {
  data_id: number;
  campaign_id: number;
  post_id: string;
  content: string;
  url: string;
  post_url?: string;
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

// ============ NEW TYPES FOR COMPREHENSIVE VALIDATION ============

/**
 * Single dimension score (1-10) with reasoning
 * Used for all 8 validation dimensions
 */
export interface DimensionScore {
  score: number;      // 1-10
  reason: string;     // Evidence explaining the score
}

/**
 * All 8 validation dimension scores
 */
export interface ValidationScores {
  market_size: DimensionScore;
  demand: DimensionScore;
  problem_clarity: DimensionScore;
  competitor_gap: DimensionScore;
  technical_feasibility: DimensionScore;
  market_growth: DimensionScore;
  pain_point_severity: DimensionScore;
  monetization_potential: DimensionScore;
  overall_score: number;  // Average of 8 dimensions
  created_at?: string;
  updated_at?: string;
}

/**
 * Theme data: frequency, sentiment, sources, and quotes
 * Same structure for all 8 theme categories
 */
export interface Theme {
  frequency: number;       // How many times this theme was mentioned
  sentiment: number;       // -1.0 to 1.0
  sources: string[];       // Platforms where this theme appeared: ["reddit", "google_play", etc.]
  quotes: string[];        // 3-5 representative quotes
}

/**
 * All 8 themes grouped by category
 * Keys: "performance", "cost", "user_interface", "learning_curve",
 *       "integration", "features", "bugs", "customer_support"
 */
export type Themes = {
  [key: string]: Theme;
};

/**
 * Competitor app data from Google Play reviews
 */
export interface CompetitorApp {
  developer: string;
  rating: number;          // e.g., 4.2
  review_count: number;    // Total reviews analyzed
  weaknesses: Themes;      // Themes extracted from negative reviews
  strengths: Themes;       // Themes extracted from positive reviews
}

/**
 * All competitor apps analyzed
 * Keys are app names
 */
export type CompetitorAnalysis = {
  [appName: string]: CompetitorApp;
};

/**
 * Single confidence factor breakdown
 */
export interface ConfidenceFactor {
  name: string;            // "Data Volume", "Data Diversity", etc.
  score: number;           // 0-100
  reason: string;
  [key: string]: any;      // Extra data (breakdown, warnings, etc.)
}

/**
 * Data quality assessment
 */
export interface ConfidenceScore {
  confidence_score: number;        // 0-100
  confidence_percentage?: string;  // "75%"
  factors?: ConfidenceFactor[];    // 5 factors: volume, diversity, coverage, freshness, compliance
  warnings?: string[];
}

/**
 * Market signals from search volume and trends
 */
export interface MarketSignals {
  monthly_search_volume: number | null;
  search_competition: string | null;    // "LOW", "MEDIUM", "HIGH"
  estimated_cpc: number | null;
  trend_direction: string | null;       // "rising", "stable", "falling"
}

/**
 * Comprehensive validation report
 * Combines all analysis data: scores, themes, confidence, market signals
 * This is the primary endpoint response used throughout the dashboard
 */
export interface ComprehensiveReport {
  status: string;
  campaign: Campaign;
  validation_scores: ValidationScores;
  confidence: ConfidenceScore;
  themes: Themes;
  competitor_analysis: CompetitorAnalysis;
  data_summary: {
    [platform: string]: number;
    total_data_points: number;
  };
  market_signals: MarketSignals;
  raw_data?: {
    reddit?: any[];
    hacker_news?: any[];
    product_hunt?: any[];
    quora?: any[];
    google_play?: any[];
    stack_exchange?: any[];
  };
}
