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
    TWITTER = "twitter"
    QUORA = "quora"


class CampaignPlatform(str, enum.Enum):
    REDDIT = "reddit"
    HACKER_NEWS = "hacker_news"
    TWITTER = "twitter"
    QUORA = "quora"
    GOOGLE_TRENDS = "google_trends"

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
    scraped_data = relationship("ScrapedData", back_populates="campaign")
    generated_comments = relationship("GeneratedComment", back_populates="campaign")
    validation_results = relationship("ValidationResult", back_populates="campaign")
    reddit_data = relationship("RedditData", back_populates="campaign")
    hackernews_data = relationship("HackerNewsData", back_populates="campaign")
    google_trends_points = relationship("GoogleTrendsPoint", back_populates="campaign")

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
    reddit_data = relationship("RedditData", back_populates="keyword")
    hackernews_data = relationship("HackerNewsData", back_populates="keyword")
    google_trends_points = relationship("GoogleTrendsPoint", back_populates="keyword")


class RedditData(Base):
    __tablename__ = "reddit_data"
    reddit_data_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), nullable=True, index=True)
    source_post_id = Column(String(100), nullable=False, index=True)
    post_url = Column(String, nullable=False)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    author = Column(String, nullable=False)
    score = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    engagement_score = Column(Integer, default=0)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("campaign_id", "source_post_id", name="uq_reddit_campaign_source_post"),
    )

    campaign = relationship("Campaign", back_populates="reddit_data")
    keyword = relationship("Keyword", back_populates="reddit_data")


class HackerNewsData(Base):
    __tablename__ = "hackernews_data"
    hn_data_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), nullable=True, index=True)
    source_post_id = Column(String(100), nullable=False, index=True)
    post_url = Column(String, nullable=False)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    author = Column(String, nullable=False)
    points = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    engagement_score = Column(Integer, default=0)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("campaign_id", "source_post_id", name="uq_hn_campaign_source_post"),
    )

    campaign = relationship("Campaign", back_populates="hackernews_data")
    keyword = relationship("Keyword", back_populates="hackernews_data")


class GoogleTrendsPoint(Base):
    __tablename__ = "google_trends_points"
    trend_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), nullable=False, index=True)
    region = Column(String(20), nullable=False, default="GLOBAL")
    trend_date = Column(DateTime(timezone=True), nullable=False, index=True)
    interest = Column(Integer, nullable=False)
    is_partial = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("campaign_id", "keyword_id", "region", "trend_date", name="uq_trends_campaign_keyword_region_date"),
        CheckConstraint("interest >= 0 AND interest <= 100", name="trend_interest_range"),
    )

    campaign = relationship("Campaign", back_populates="google_trends_points")
    keyword = relationship("Keyword", back_populates="google_trends_points")

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
    
    # Relationships
    campaign = relationship("Campaign", back_populates="scraped_data")
    keyword = relationship("Keyword", back_populates="scraped_data")
    analysis = relationship("NLPAnalysis", uselist=False, back_populates="scraped_data")
    generated_comments = relationship("GeneratedComment", back_populates="scraped_data")

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