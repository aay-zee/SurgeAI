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
