from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Boolean, ARRAY, UniqueConstraint, Float, JSON, CheckConstraint
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class CampaignStatus(str, enum.Enum):
    PENDING = "pending"
    SCRAPING = "scraping"
    COMPLETED = "completed"
    FAILED = "failed"
    ACTIVE = "active"
    PAUSED = "paused"

class Platform(str, enum.Enum):
    REDDIT = "reddit"
    HACKER_NEWS = "hacker_news"
    GOOGLE_PLAY = "google_play"

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    CLIENT = "client"

class CommentStatus(str, enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    POSTED = "posted"
    REJECTED = "rejected"

class SentimentLabel(str, enum.Enum):
    positive = "positive"
    negative = "negative"
    neutral = "neutral"

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.CLIENT, nullable=False)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    reset_token = Column(String, nullable=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship with campaigns
    campaigns = relationship("Campaign", back_populates="user")

class Campaign(Base):
    __tablename__ = "campaigns"
    campaign_id = Column(Integer, primary_key=True, index=True)
    campaign_name = Column("name", String, index=True, nullable=False)
    description = Column(Text)
    keywords_text = Column("keywords", Text, nullable=False, default="")
    platforms = Column(ARRAY(String), default=["reddit", "twitter", "quora"])  # Selected platforms
    status = Column(Enum(CampaignStatus), default=CampaignStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="campaigns")
    keywords = relationship("Keyword", back_populates="campaign", cascade="all, delete-orphan")
    scraped_data = relationship("ScrapedData", back_populates="campaign", cascade="all, delete-orphan")
    generated_comments = relationship("GeneratedComment", back_populates="campaign", cascade="all, delete-orphan")
    validation_results = relationship("ValidationResult", back_populates="campaign", cascade="all, delete-orphan")
    validation_scores = relationship("ValidationScore", back_populates="campaign", cascade="all, delete-orphan")
    hackernews_data = relationship("HackerNewsData", back_populates="campaign", cascade="all, delete-orphan")
    google_play_data = relationship("GooglePlayData", back_populates="campaign", cascade="all, delete-orphan")
    google_trends_points = relationship("GoogleTrendsPoint", back_populates="campaign", cascade="all, delete-orphan")
    search_volume_data = relationship("SearchVolumeData", back_populates="campaign", cascade="all, delete-orphan")
    llm_analyses = relationship("LLMAnalysis", back_populates="campaign", cascade="all, delete-orphan")

class Keyword(Base):
    __tablename__ = "keywords"
    keyword_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    keyword = Column(String, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    campaign = relationship("Campaign", back_populates="keywords")
    activities = relationship("KeywordActivity", back_populates="keyword", cascade="all, delete-orphan")
    scraped_data = relationship("ScrapedData", back_populates="keyword")

class KeywordActivity(Base):
    __tablename__ = "keyword_activities"
    id = Column(Integer, primary_key=True, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), nullable=False, index=True)
    platform = Column(Enum(Platform), nullable=False)
    post_count = Column(Integer, default=0)
    engagement_count = Column(Integer, default=0)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    keyword = relationship("Keyword", back_populates="activities")
    
    # Unique constraint: one record per keyword per platform
    __table_args__ = (
        UniqueConstraint('keyword_id', 'platform', name='uq_keyword_platform'),
    )

class ScrapedData(Base):
    __tablename__ = "scraped_data"
    data_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), index=True, nullable=True)
    platform = Column(Enum(Platform), nullable=False)
    post_id = Column(String, unique=True, index=True)
    post_url = Column(String)
    content = Column(Text)
    author = Column(String)
    engagement_score = Column(Integer, default=0)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())
    is_relevant = Column(Boolean, default=True, nullable=False)
    relevance_score = Column(Float, nullable=True)
    embedding = Column(JSON, nullable=True)

    # Relationships
    campaign = relationship("Campaign", back_populates="scraped_data")
    keyword = relationship("Keyword", back_populates="scraped_data")
    analysis = relationship("NLPAnalysis", uselist=False, back_populates="scraped_data", cascade="all, delete-orphan")
    generated_comments = relationship("GeneratedComment", back_populates="scraped_data", cascade="all, delete-orphan")

class NLPAnalysis(Base):
    __tablename__ = "nlp_analysis"
    analysis_id = Column(Integer, primary_key=True, index=True)
    data_id = Column(Integer, ForeignKey("scraped_data.data_id"), nullable=False, unique=True)
    sentiment_score = Column(Float, nullable=True)
    sentiment_label = Column(Enum(SentimentLabel), nullable=False)
    topics = Column(JSON, nullable=True)
    keywords_extracted = Column(JSON, nullable=True)
    intent = Column(String(50), nullable=True)
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (CheckConstraint("sentiment_score >= -1.0 AND sentiment_score <= 1.0", name="sentiment_score_range"),)
    scraped_data = relationship("ScrapedData", back_populates="analysis")

class ValidationResult(Base):
    __tablename__ = "validation_results"
    validation_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False)
    demand_score = Column(Float, nullable=True)
    sentiment_aggregate = Column(Float, nullable=True)
    positive_mentions = Column(Integer, default=0)
    negative_mentions = Column(Integer, default=0)
    neutral_mentions = Column(Integer, default=0)
    summary = Column(Text, nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (
        CheckConstraint("demand_score >= 0 AND demand_score <= 100", name="demand_score_range"),
        CheckConstraint("sentiment_aggregate >= -1.0 AND sentiment_aggregate <= 1.0", name="sentiment_aggregate_range"),
    )
    campaign = relationship("Campaign", back_populates="validation_results")

class GeneratedComment(Base):
    __tablename__ = "generated_comments"
    comment_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False)
    data_id = Column(Integer, ForeignKey("scraped_data.data_id"), nullable=False)
    generated_comment = Column(Text, nullable=False)
    status = Column(Enum(CommentStatus), default=CommentStatus.DRAFT)
    target_platform = Column(String(200), nullable=False)
    target_post_id = Column(String(100), nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    posted_at = Column(DateTime(timezone=True), nullable=True)
    campaign = relationship("Campaign", back_populates="generated_comments")
    scraped_data = relationship("ScrapedData", back_populates="generated_comments")


# ─────────────────── NEW TABLES (from intelligence layer) ───────────────────

class HackerNewsData(Base):
    __tablename__ = "hackernews_data"
    hn_data_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), nullable=True, index=True)
    source_post_id = Column(String, nullable=False)
    post_url = Column(String, nullable=True)
    title = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    author = Column(String, nullable=True)
    points = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    engagement_score = Column(Integer, default=0)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (UniqueConstraint('campaign_id', 'source_post_id', name='uq_hn_campaign_post'),)
    campaign = relationship("Campaign", back_populates="hackernews_data")


class GooglePlayData(Base):
    __tablename__ = "google_play_data"
    gp_data_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), nullable=True, index=True)
    app_id = Column(String, nullable=False)
    app_name = Column(String, nullable=True)
    app_url = Column(String, nullable=True)
    developer = Column(String, nullable=True)
    app_rating = Column(Float, nullable=True)
    review_id = Column(String, nullable=False)
    review_content = Column(Text, nullable=True)
    review_rating = Column(Integer, nullable=True)
    reviewer_name = Column(String, nullable=True)
    thumbs_up = Column(Integer, default=0)
    engagement_score = Column(Integer, default=0)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (UniqueConstraint('campaign_id', 'review_id', name='uq_gp_campaign_review'),)
    campaign = relationship("Campaign", back_populates="google_play_data")


class SearchVolumeData(Base):
    __tablename__ = "search_volume_data"
    sv_data_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), nullable=True, index=True)
    keyword_text = Column(String, nullable=False)
    monthly_volume = Column(Integer, default=0)
    cpc = Column(Float, nullable=True)
    competition = Column(Float, nullable=True)
    trend_direction = Column(String, nullable=True)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())
    campaign = relationship("Campaign", back_populates="search_volume_data")


class ValidationScore(Base):
    __tablename__ = "validation_scores"
    score_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    market_size = Column(Float, nullable=True)
    demand = Column(Float, nullable=True)
    problem_clarity = Column(Float, nullable=True)
    competitor_gap = Column(Float, nullable=True)
    technical_feasibility = Column(Float, nullable=True)
    market_growth = Column(Float, nullable=True)
    pain_point_severity = Column(Float, nullable=True)
    monetization_potential = Column(Float, nullable=True)
    overall_score = Column(Float, nullable=True)
    market_size_reason = Column(Text, nullable=True)
    demand_reason = Column(Text, nullable=True)
    problem_clarity_reason = Column(Text, nullable=True)
    competitor_gap_reason = Column(Text, nullable=True)
    technical_feasibility_reason = Column(Text, nullable=True)
    market_growth_reason = Column(Text, nullable=True)
    pain_point_severity_reason = Column(Text, nullable=True)
    monetization_potential_reason = Column(Text, nullable=True)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    campaign = relationship("Campaign", back_populates="validation_scores")


class GoogleTrendsPoint(Base):
    __tablename__ = "google_trends_points"
    trend_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), nullable=True, index=True)
    region = Column(String, default="GLOBAL")
    trend_date = Column(DateTime(timezone=True), nullable=False)
    interest = Column(Integer, nullable=False)
    is_partial = Column(Boolean, default=False)
    __table_args__ = (UniqueConstraint('campaign_id', 'keyword_id', 'region', 'trend_date', name='uq_trend_point'),)
    campaign = relationship("Campaign", back_populates="google_trends_points")


class LLMAnalysis(Base):
    __tablename__ = "llm_analyses"
    llm_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    themes = Column(JSON, nullable=True)
    competitor_analysis = Column(JSON, nullable=True)
    report_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    campaign = relationship("Campaign", back_populates="llm_analyses")