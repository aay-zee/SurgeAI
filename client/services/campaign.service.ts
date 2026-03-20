import api from '@/lib/axios';
import {
  Campaign,
  CampaignCreate,
  ScrapedData,
  SentimentSummary,
  ValidationScores,
  Themes,
  CompetitorAnalysis,
  ConfidenceScore,
  ComprehensiveReport,
} from '@/types/campaign';

export const campaignService = {
  // ============ CAMPAIGN MANAGEMENT ============
  async getCampaigns(): Promise<Campaign[]> {
    const response = await api.get<Campaign[]>('/campaigns');
    return response.data;
  },

  async getCampaign(id: number): Promise<Campaign> {
    const response = await api.get<Campaign>(`/campaigns/${id}`);
    return response.data;
  },

  async createCampaign(data: CampaignCreate): Promise<Campaign> {
    const response = await api.post<Campaign>('/campaigns', data);
    return response.data;
  },

  async updateCampaign(id: number, data: Partial<CampaignCreate>): Promise<Campaign> {
    const response = await api.put<Campaign>(`/campaigns/${id}`, data);
    return response.data;
  },

  async deleteCampaign(id: number): Promise<void> {
    await api.delete(`/campaigns/${id}`);
  },

  // ============ COMPREHENSIVE REPORT (PRIMARY ENDPOINT) ============
  /**
   * Get complete validation report with all data
   * This is the main endpoint used by the dashboard
   */
  async getComprehensiveReport(id: number): Promise<ComprehensiveReport> {
    const response = await api.get<ComprehensiveReport>(
      `/campaigns/${id}/report`
    );
    return response.data;
  },

  // ============ VALIDATION SCORING ============
  async calculateValidationScores(
    id: number
  ): Promise<ValidationScores> {
    const response = await api.post<{
      scores: ValidationScores;
      overall_score: number;
    }>(`/campaigns/${id}/calculate-validation`);
    return response.data.scores || response.data as any;
  },

  async getValidationScores(id: number): Promise<ValidationScores> {
    const response = await api.get<ValidationScores>(
      `/campaigns/${id}/validation-score`
    );
    return response.data;
  },

  // ============ THEME EXTRACTION ============
  async extractThemes(id: number): Promise<Themes> {
    const response = await api.post<{
      themes: Themes;
      theme_count: number;
    }>(`/campaigns/${id}/extract-themes`);
    return response.data.themes;
  },

  async extractCompetitorThemes(id: number): Promise<CompetitorAnalysis> {
    const response = await api.post<{
      competitor_apps: CompetitorAnalysis;
      competitor_count: number;
    }>(`/campaigns/${id}/extract-competitor-themes`);
    return response.data.competitor_apps;
  },

  // ============ CONFIDENCE SCORING ============
  async calculateConfidence(id: number): Promise<ConfidenceScore> {
    const response = await api.post<{
      confidence_score: number;
      confidence_percentage: string;
      factors: ConfidenceScore['factors'];
      warnings: string[];
    }>(`/campaigns/${id}/calculate-confidence`);
    return {
      confidence_score: response.data.confidence_score,
      confidence_percentage: response.data.confidence_percentage,
      factors: response.data.factors,
      warnings: response.data.warnings,
    };
  },

  // ============ PLATFORM-SPECIFIC DATA ============
  async getRedditData(id: number, limit: number = 200): Promise<ScrapedData[]> {
    const response = await api.get<ScrapedData[]>(
      `/campaigns/${id}/reddit-data?limit=${limit}`
    );
    return response.data;
  },

  async getHackerNewsData(
    id: number,
    limit: number = 200
  ): Promise<ScrapedData[]> {
    const response = await api.get<ScrapedData[]>(
      `/campaigns/${id}/hackernews-data?limit=${limit}`
    );
    return response.data;
  },

  async getProductHuntData(id: number, limit: number = 100): Promise<any[]> {
    const response = await api.get<any[]>(
      `/campaigns/${id}/product-hunt-data?limit=${limit}`
    );
    return response.data;
  },

  async getQuoraData(id: number, limit: number = 100): Promise<any[]> {
    const response = await api.get<any[]>(
      `/campaigns/${id}/quora-data?limit=${limit}`
    );
    return response.data;
  },

  async getGooglePlayData(id: number, limit: number = 500): Promise<any[]> {
    const response = await api.get<any[]>(
      `/campaigns/${id}/google-play-data?limit=${limit}`
    );
    return response.data;
  },

  async getStackExchangeData(id: number, limit: number = 200): Promise<any[]> {
    const response = await api.get<any[]>(
      `/campaigns/${id}/stack-exchange-data?limit=${limit}`
    );
    return response.data;
  },

  async getSearchVolumeData(id: number, limit: number = 200): Promise<any[]> {
    const response = await api.get<any[]>(
      `/campaigns/${id}/search-volume-data?limit=${limit}`
    );
    return response.data;
  },

  // ============ ANALYTICS DATA ============
  async getAnalytics(id: number): Promise<any> {
    const response = await api.get<any>(`/campaigns/${id}/analytics`);
    return response.data;
  },

  // ============ GENERATED COMMENTS ============
  async getGeneratedComments(id: number, platform?: string, status?: string): Promise<any[]> {
    let url = `/campaigns/${id}/generated-comments`;
    const params = new URLSearchParams();
    if (platform) params.append('platform', platform);
    if (status) params.append('status_filter', status);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await api.get<any[]>(url);
    return response.data;
  },

  // ============ SOCIAL FEEDBACK ============
  async getSocialFeedback(id: number, sentiment?: string, platform?: string): Promise<any[]> {
    let url = `/campaigns/${id}/social-feedback`;
    const params = new URLSearchParams();
    if (sentiment) params.append('sentiment_filter', sentiment);
    if (platform) params.append('platform', platform);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await api.get<any[]>(url);
    return response.data;
  },

  // ============ AI REPORT (Mistral 7B / Llama-3-8B) ============
  async generateLLMReport(id: number): Promise<{ report: string; model_used: string }> {
    const response = await api.post<{ report: string; model_used: string; status: string }>(
      `/campaigns/${id}/generate-llm-report`
    );
    return response.data;
  },

  // ============ LEGACY ENDPOINTS (Keep for backward compatibility) ============
  async getCampaignScrapedData(id: number): Promise<ScrapedData[]> {
    const response = await api.get<ScrapedData[]>(`/campaigns/${id}/posts`);
    return response.data;
  },

  async getCampaignSentimentSummary(id: number): Promise<SentimentSummary> {
    const response = await api.get<SentimentSummary>(
      `/campaigns/${id}/sentiment-summary`
    );
    return response.data;
  },
};
