from pydantic import BaseModel, EmailStr, field_validator, model_validator
from datetime import datetime
from typing import Optional
import re
from .models import CampaignStatus, Platform, CampaignPlatform, UserRole
from .validations import (
    validate_password_strength,
    validate_email,
    validate_full_name,
    sanitize_input
)

# Authentication schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    
    @field_validator('email')
    @classmethod
    def validate_email_field(cls, v: str) -> str:
        """Validate and sanitize email."""
        is_valid, error_msg = validate_email(v)
        if not is_valid:
            raise ValueError(error_msg)
        return sanitize_input(v.lower(), max_length=255)
    
    @field_validator('password')
    @classmethod
    def validate_password_field(cls, v: str) -> str:
        """Validate password strength."""
        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        return v
    
    @field_validator('full_name')
    @classmethod
    def validate_full_name_field(cls, v: Optional[str]) -> Optional[str]:
        """Validate and sanitize full name."""
        if v:
            is_valid, error_msg = validate_full_name(v)
            if not is_valid:
                raise ValueError(error_msg)
            return sanitize_input(v, max_length=100)
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: int
    email: str
    full_name: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefresh(BaseModel):
    refresh_token: str

class ForgotPassword(BaseModel):
    email: EmailStr
    
    @field_validator('email')
    @classmethod
    def validate_email_field(cls, v: str) -> str:
        """Validate and sanitize email."""
        is_valid, error_msg = validate_email(v)
        if not is_valid:
            raise ValueError(error_msg)
        return sanitize_input(v.lower(), max_length=255)

class ResetPassword(BaseModel):
    token: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password_field(cls, v: str) -> str:
        """Validate new password strength."""
        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        return v

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password_field(cls, v: str) -> str:
        """Validate new password strength."""
        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        return v
    
    @model_validator(mode='after')
    def validate_passwords_differ(self):
        """Ensure new password is different from current password."""
        if self.current_password == self.new_password:
            raise ValueError("New password must be different from current password")
        return self

# Campaign schemas
class CampaignCreate(BaseModel):
    campaign_name: str
    description: str | None = None
    keywords: list[str]  # ["AI chatbot", "customer service", "SaaS"]
    platforms: list[CampaignPlatform] = [
        CampaignPlatform.REDDIT,
        CampaignPlatform.HACKER_NEWS,
        CampaignPlatform.TWITTER,
        CampaignPlatform.QUORA,
    ]
    region: str | None = None

    @field_validator("region")
    @classmethod
    def validate_region_field(cls, v: str | None) -> str | None:
        """Validate optional Google Trends region code (e.g., US, IN, US-CA)."""
        if v is None:
            return None

        normalized = sanitize_input(v.upper(), max_length=20)
        if normalized in {"", "GLOBAL", "WORLD", "ALL"}:
            return None

        if not re.match(r"^[A-Z]{2}(-[A-Z0-9]{1,3})?$", normalized):
            raise ValueError("Region must be like US, IN, or US-CA")

        return normalized

class Campaign(BaseModel):
    campaign_id: int
    campaign_name: str
    description: str | None
    platforms: list[str]  # ["reddit", "twitter", "quora"]
    status: CampaignStatus
    created_at: datetime
    user_id: int
    keywords: list["Keyword"] = []

    class Config:
        from_attributes = True

# Keyword schemas
class KeywordCreate(BaseModel):
    keyword: str

class KeywordCreateBulk(BaseModel):
    keywords: list[str]

class Keyword(BaseModel):
    keyword_id: int
    campaign_id: int
    keyword: str
    created_at: datetime
    activities: list["KeywordActivity"] = []

    class Config:
        from_attributes = True

class KeywordActivity(BaseModel):
    id: int
    keyword_id: int
    platform: Platform
    post_count: int
    engagement_count: int
    last_updated: datetime

    class Config:
        from_attributes = True

class KeywordStats(BaseModel):
    keyword_id: int
    keyword: str
    total_posts: int
    total_engagement: int
    platform_stats: dict[str, dict]  # {"reddit": {"posts": 10, "engagement": 50}}
    rank: int | None = None

class KeywordRankingResponse(BaseModel):
    campaign_id: int
    platform: Platform | None
    keywords: list[KeywordStats]
    ranked_at: datetime

class ScrapedData(BaseModel):
    data_id: int
    campaign_id: int
    keyword_id: int | None = None
    platform: Platform
    post_id: str | None = None
    post_url: str | None = None
    content: str | None = None
    author: str | None = None
    engagement_score: int = 0
    scraped_at: datetime

    class Config:
        from_attributes = True

# Update forward references for Pydantic
Campaign.model_rebuild()
Keyword.model_rebuild()
KeywordActivity.model_rebuild()

# NLP Analysis schemas
class NLPAnalysisBase(BaseModel):
    sentiment_score: float | None = None
    sentiment_label: str
    topics: dict | None = None
    keywords_extracted: dict | None = None
    intent: str | None = None

class NLPAnalysisCreate(NLPAnalysisBase):
    data_id: int

class NLPAnalysisRead(NLPAnalysisBase):
    analysis_id: int
    data_id: int
    analyzed_at: datetime

    class Config:
        from_attributes = True

class ScrapedDataWithAnalysis(ScrapedData):
    analysis: NLPAnalysisRead | None = None


class RedditData(BaseModel):
    reddit_data_id: int
    campaign_id: int
    keyword_id: int | None = None
    source_post_id: str
    post_url: str
    title: str | None = None
    content: str
    author: str
    score: int = 0
    comments_count: int = 0
    engagement_score: int = 0
    scraped_at: datetime

    class Config:
        from_attributes = True


class HackerNewsData(BaseModel):
    hn_data_id: int
    campaign_id: int
    keyword_id: int | None = None
    source_post_id: str
    post_url: str
    title: str | None = None
    content: str
    author: str
    points: int = 0
    comments_count: int = 0
    engagement_score: int = 0
    scraped_at: datetime

    class Config:
        from_attributes = True


class ProductHuntData(BaseModel):
    ph_data_id: int
    campaign_id: int
    keyword_id: int | None = None
    source_product_id: str
    product_url: str
    product_name: str
    tagline: str | None = None
    description: str
    category: str | None = None
    upvotes: int = 0
    comments_count: int = 0
    maker_name: str | None = None
    engagement_score: int = 0
    scraped_at: datetime

    class Config:
        from_attributes = True


class QuoraData(BaseModel):
    quora_data_id: int
    campaign_id: int
    keyword_id: int | None = None
    source_post_id: str
    question_url: str
    question_title: str
    description: str | None = None
    top_answer: str | None = None
    author: str | None = None
    upvotes: int = 0
    answer_count: int = 0
    engagement_score: int = 0
    scraped_at: datetime

    class Config:
        from_attributes = True


class GooglePlayData(BaseModel):
    gp_data_id: int
    campaign_id: int
    keyword_id: int | None = None
    app_id: str
    app_name: str
    app_url: str | None = None
    developer: str | None = None
    app_rating: float | None = None
    review_id: str
    review_content: str | None = None
    review_rating: int | None = None
    reviewer_name: str | None = None
    thumbs_up: int = 0
    engagement_score: int = 0
    scraped_at: datetime

    class Config:
        from_attributes = True


class StackExchangeData(BaseModel):
    se_data_id: int
    campaign_id: int
    keyword_id: int | None = None
    source_question_id: str
    site: str
    question_url: str
    question_title: str
    question_body: str | None = None
    accepted_answer: str | None = None
    tags: str | None = None
    votes: int = 0
    answer_count: int = 0
    view_count: int = 0
    is_answered: bool = False
    engagement_score: int = 0
    scraped_at: datetime

    class Config:
        from_attributes = True


class SearchVolumeData(BaseModel):
    volume_id: int
    campaign_id: int
    keyword_id: int
    keyword: str
    monthly_volume: int = 0
    competition: str | None = None
    competition_index: int | None = None
    cpc: float | None = None
    trend_direction: str | None = None
    captured_at: datetime

    class Config:
        from_attributes = True


class ValidationScore(BaseModel):
    score_id: int
    campaign_id: int
    market_size: int
    demand: int
    problem_clarity: int
    competitor_gap: int
    technical_feasibility: int
    market_growth: int
    pain_point_severity: int
    monetization_potential: int
    market_size_reason: str | None = None
    demand_reason: str | None = None
    problem_clarity_reason: str | None = None
    competitor_gap_reason: str | None = None
    technical_feasibility_reason: str | None = None
    market_growth_reason: str | None = None
    pain_point_severity_reason: str | None = None
    monetization_potential_reason: str | None = None
    overall_score: float | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GoogleTrendsPoint(BaseModel):
    trend_id: int
    campaign_id: int
    keyword_id: int
    region: str
    trend_date: datetime
    interest: int
    is_partial: bool = False

    class Config:
        from_attributes = True
