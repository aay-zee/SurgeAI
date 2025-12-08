"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

// Sample campaign data
const initialCampaigns = [
  { id: "1", name: "AI Marketing Q1" },
  { id: "2", name: "Product Launch 2024" },
  { id: "3", name: "Social Media Outreach" },
  { id: "4", name: "Brand Awareness" },
];

interface Campaign {
  id: string;
  name: string;
}

interface CampaignContextType {
  selectedCampaignId: string;
  setSelectedCampaignId: (id: string) => void;
  campaigns: Campaign[];
}

const CampaignContext = createContext<CampaignContextType | undefined>(
  undefined
);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    initialCampaigns[0].id
  );
  // In a real app, you might fetch campaigns from an API here
  const [campaigns] = useState<Campaign[]>(initialCampaigns);

  return (
    <CampaignContext.Provider
      value={{ selectedCampaignId, setSelectedCampaignId, campaigns }}
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
