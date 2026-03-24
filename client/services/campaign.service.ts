import api from '@/lib/axios';
import { Campaign, CampaignCreate, ValidationResult } from '@/types/campaign';

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
};
