import api from '@/lib/axios';
import { Campaign, CampaignCreate } from '@/types/campaign';

export const campaignService = {
  // Get all campaigns for the current user
  async getCampaigns(): Promise<Campaign[]> {
    const response = await api.get<Campaign[]>('/campaigns/');
    return response.data;
  },

  // Get a specific campaign
  async getCampaign(id: number): Promise<Campaign> {
    const response = await api.get<Campaign>(`/campaigns/${id}`);
    return response.data;
  },

  // Create a new campaign
  async createCampaign(data: CampaignCreate): Promise<Campaign> {
    const response = await api.post<Campaign>('/campaigns/', data);
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
  }
};
