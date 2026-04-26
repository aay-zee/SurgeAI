import api from '@/lib/axios';
import { Campaign, CampaignCreate, ValidationResult, ValidationScores, Themes, CompetitorAnalysis, ConfidenceScore } from '@/types/campaign';

export const campaignService = {
  // Get all campaigns for the current user
  async getCampaigns(): Promise<Campaign[]> {
    const response = await api.get<Campaign[]>('/campaigns');
    return response.data;
  },

  // Get a specific campaign
  async getCampaign(id: number): Promise<Campaign> {
    const response = await api.get<Campaign>(`/campaigns/${id}`);
    return response.data;
  },

  // Create a new campaign
  async createCampaign(data: CampaignCreate): Promise<Campaign> {
    const response = await api.post<Campaign>('/campaigns', data);
    return response.data;
  },

  // Update a campaign
  async updateCampaign(id: number, data: Partial<CampaignCreate>): Promise<Campaign> {
    const response = await api.put<Campaign>(`/campaigns/${id}`, data);
    return response.data;
  },

  // Delete a campaign
  async deleteCampaign(id: number): Promise<void> {
    await api.delete(`/campaigns/${id}`);
  },

  // Get scraped data for a campaign
  async getCampaignScrapedData(id: number): Promise<import('@/types/campaign').ScrapedData[]> {
    const response = await api.get<import('@/types/campaign').ScrapedData[]>(`/campaigns/${id}/posts`);
    return response.data;
  },

  // Get sentiment summary for a campaign
  async getCampaignSentimentSummary(id: number): Promise<import('@/types/campaign').SentimentSummary> {
    const response = await api.get<import('@/types/campaign').SentimentSummary>(`/campaigns/${id}/sentiment-summary`);
    return response.data;
  },

  // Get the latest validation result for a campaign
  async getValidationResult(id: number): Promise<ValidationResult> {
    const response = await api.get<ValidationResult>(`/campaigns/${id}/validation-result`);
    return response.data;
  },

  // Re-trigger NLP + validation pipeline (skips re-scraping)
  async triggerAnalysis(id: number): Promise<{ message: string; campaign_id: number }> {
    const response = await api.post(`/campaigns/${id}/analyze`);
    return response.data;
  },

  async getMarketSignals(id: number): Promise<import('@/types/campaign').MarketSignals> {
    const response = await api.get(`/campaigns/${id}/market-signals`);
    return response.data;
  },

  async runTrendsScraper(id: number): Promise<{ message: string; campaign_id: number }> {
    const response = await api.post(`/campaigns/${id}/run-trends-scraper`);
    return response.data;
  },

  // ─────────────────── Intelligence Layer ───────────────────

  async calculateValidationScores(id: number): Promise<ValidationScores> {
    const response = await api.post<{ scores: ValidationScores; overall_score: number }>(`/campaigns/${id}/calculate-validation`);
    return response.data.scores || (response.data as any);
  },

  async getValidationScores(id: number): Promise<ValidationScores> {
    const response = await api.get<ValidationScores>(`/campaigns/${id}/validation-score`);
    return response.data;
  },

  async runLLMValidation(id: number): Promise<ValidationScores> {
    const response = await api.post<{ scores: ValidationScores; overall_score: number }>(`/campaigns/${id}/llm-validation`);
    return response.data.scores || (response.data as any);
  },

  async extractThemes(id: number): Promise<Themes> {
    const response = await api.post<{ themes: Themes; theme_count: number }>(`/campaigns/${id}/extract-themes`);
    return response.data.themes;
  },

  async extractCompetitorThemes(id: number): Promise<CompetitorAnalysis> {
    const response = await api.post<{ competitor_apps: CompetitorAnalysis; competitor_count: number }>(`/campaigns/${id}/extract-competitor-themes`);
    return response.data.competitor_apps;
  },

  async calculateConfidence(id: number): Promise<ConfidenceScore> {
    const response = await api.post<ConfidenceScore>(`/campaigns/${id}/calculate-confidence`);
    return response.data;
  },

  async generateLLMReport(id: number): Promise<{ report: string; model_used: string }> {
    const response = await api.post<{ report: string; model_used: string; status: string }>(`/campaigns/${id}/generate-llm-report`);
    return response.data;
  },

  async getHackerNewsData(id: number, limit: number = 200): Promise<import('@/types/campaign').ScrapedData[]> {
    const response = await api.get<import('@/types/campaign').ScrapedData[]>(`/campaigns/${id}/hackernews-data?limit=${limit}`);
    return response.data;
  },

  async getGooglePlayData(id: number, limit: number = 500): Promise<any[]> {
    const response = await api.get<any[]>(`/campaigns/${id}/google-play-data?limit=${limit}`);
    return response.data;
  },
};
