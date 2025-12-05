from pydantic import BaseModel
from datetime import datetime
from .models import CampaignStatus, Platform

class CampaignCreate(BaseModel):
    name: str
    description: str | None = None
    keywords: str #"ai chatbot, customer service, saas" --> just an example so things remain cler

class Campaign(BaseModel):
    id: int
    name: str
    description: str | None
    keywords: str
    status: CampaignStatus
    created_at: datetime

    class Config:
        orm_mode = True


class ScrapedData(BaseModel):
    id: int
    campaign_id: int
    platform: Platform
    post_id: str | None = None
    post_url: str | None = None
    content: str | None = None
    author: str | None = None
    scraped_at: datetime

    class Config:
        orm_mode = True