"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { campaignService } from "@/services/campaign.service";
import { Campaign } from "@/types/campaign";

interface CampaignContextType {
  selectedCampaignId: string;
  setSelectedCampaignId: (id: string) => void;
  campaigns: Campaign[];
  isLoading: boolean;
  refreshCampaigns: () => Promise<void>;
  selectedCampaign: Campaign | undefined;
}

const CampaignContext = createContext<CampaignContextType | undefined>(
  undefined
);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const data = await campaignService.getCampaigns();
      console.log("[CampaignProvider] fetched campaigns successfully:", data.length);
      setCampaigns(data);
      
      // Select the first campaign by default if none selected or invalid
      if (data.length > 0 && (!selectedCampaignId || !data.find(c => c.campaign_id.toString() === selectedCampaignId))) {
        setSelectedCampaignId(data[0].campaign_id.toString());
      }
    } catch (error: any) {
      // Ignore 401 errors as they are handled by the axios interceptor
      if (error.response?.status !== 401) {
        console.error("Failed to fetch campaigns:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const selectedCampaign = campaigns.find(c => c.campaign_id.toString() === selectedCampaignId);

  return (
    <CampaignContext.Provider
      value={{ 
        selectedCampaignId, 
        setSelectedCampaignId, 
        campaigns, 
        isLoading,
        refreshCampaigns: fetchCampaigns,
        selectedCampaign
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error("useCampaign must be used within a CampaignProvider");
  }
  return context;
}
