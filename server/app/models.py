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
    PRODUCT_HUNT = "product_hunt"
    GOOGLE_PLAY = "google_play"
    SEARCH_VOLUME = "search_volume"


class CampaignPlatform(str, enum.Enum):
    REDDIT = "reddit"
    HACKER_NEWS = "hacker_news"
    TWITTER = "twitter"
    QUORA = "quora"
    GOOGLE_TRENDS = "google_trends"
    PRODUCT_HUNT = "product_hunt"
    GOOGLE_PLAY = "google_play"
    SEARCH_VOLUME = "search_volume"

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
    
    # Semantic pipeline fields
    generated_keywords = Column(JSON, nullable=True)
    problem_embedding = Column(JSON, nullable=True)

    # Relationships
    user = relationship("User", back_populates="campaigns")
    keywords = relationship("Keyword", back_populates="campaign", cascade="all, delete-orphan")
    llm_analysis = relationship("LLMAnalysis", back_populates="campaign", uselist=False)
    scraped_data = relationship("ScrapedData", back_populates="campaign")
    generated_comments = relationship("GeneratedComment", back_populates="campaign")
    validation_results = relationship("ValidationResult", back_populates="campaign")
    validation_scores = relationship("ValidationScore", back_populates="campaign")
    reddit_data = relationship("RedditData", back_populates="campaign")
    hackernews_data = relationship("HackerNewsData", back_populates="campaign")
    product_hunt_data = relationship("ProductHuntData", back_populates="campaign")
    quora_data = relationship("QuoraData", back_populates="campaign")
    google_play_data = relationship("GooglePlayData", back_populates="campaign")
    search_volume_data = relationship("SearchVolumeData", back_populates="campaign")
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
    product_hunt_data = relationship("ProductHuntData", back_populates="keyword")
    quora_data = relationship("QuoraData", back_populates="keyword")
    google_play_data = relationship("GooglePlayData", back_populates="keyword")
    search_volume_data = relationship("SearchVolumeData", back_populates="keyword_obj")
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


class ProductHuntData(Base):
    __tablename__ = "product_hunt_data"
    ph_data_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), nullable=True, index=True)
    source_product_id = Column(String(100), nullable=False, index=True)
    product_url = Column(String, nullable=False)
    product_name = Column(String, nullable=False)
    tagline = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=True)
    upvotes = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    maker_name = Column(String, nullable=True)
    engagement_score = Column(Integer, default=0)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("campaign_id", "source_product_id", name="uq_ph_campaign_source_product"),
    )

    campaign = relationship("Campaign", back_populates="product_hunt_data")
    keyword = relationship("Keyword", back_populates="product_hunt_data")


class QuoraData(Base):
    __tablename__ = "quora_data"
    quora_data_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), nullable=True, index=True)
    source_post_id = Column(String(500), nullable=False, index=True)
    question_url = Column(String, nullable=False)
    question_title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    top_answer = Column(Text, nullable=True)
    author = Column(String, nullable=True)
    upvotes = Column(Integer, default=0)
    answer_count = Column(Integer, default=0)
    engagement_score = Column(Integer, default=0)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("campaign_id", "source_post_id", name="uq_quora_campaign_source"),
    )

    campaign = relationship("Campaign", back_populates="quora_data")
    keyword = relationship("Keyword", back_populates="quora_data")


class GooglePlayData(Base):
    __tablename__ = "google_play_data"
    gp_data_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), nullable=True, index=True)
    app_id = Column(String(200), nullable=False, index=True)
    app_name = Column(String, nullable=False)
    app_url = Column(String, nullable=True)
    developer = Column(String, nullable=True)
    app_rating = Column(Float, nullable=True)
    review_id = Column(String(200), nullable=False, index=True)
    review_content = Column(Text, nullable=True)
    review_rating = Column(Integer, nullable=True)
    reviewer_name = Column(String, nullable=True)
    thumbs_up = Column(Integer, default=0)
    engagement_score = Column(Integer, default=0)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("campaign_id", "review_id", name="uq_gp_campaign_review"),
    )

    campaign = relationship("Campaign", back_populates="google_play_data")
    keyword = relationship("Keyword", back_populates="google_play_data")


class SearchVolumeData(Base):
    __tablename__ = "search_volume_data"
    volume_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.keyword_id"), nullable=False, index=True)
    keyword = Column(String, nullable=False)
    monthly_volume = Column(Integer, default=0)
    competition = Column(String(20), nullable=True)
    competition_index = Column(Integer, nullable=True)
    cpc = Column(Float, nullable=True)
    trend_direction = Column(String(20), nullable=True)
    captured_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("campaign_id", "keyword_id", name="uq_sv_campaign_keyword"),
    )

    campaign = relationship("Campaign", back_populates="search_volume_data")
    keyword_obj = relationship("Keyword", back_populates="search_volume_data")


class ValidationScore(Base):
    __tablename__ = "validation_scores"
    score_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)

    # 8 Dimension Scores (1-10 each)
    market_size = Column(Integer, nullable=False)
    demand = Column(Integer, nullable=False)
    problem_clarity = Column(Integer, nullable=False)
    competitor_gap = Column(Integer, nullable=False)
    technical_feasibility = Column(Integer, nullable=False)
    market_growth = Column(Integer, nullable=False)
    pain_point_severity = Column(Integer, nullable=False)
    monetization_potential = Column(Integer, nullable=False)

    # Evidence/reasoning for each (stored as JSON or text)
    market_size_reason = Column(String, nullable=True)
    demand_reason = Column(String, nullable=True)
    problem_clarity_reason = Column(String, nullable=True)
    competitor_gap_reason = Column(String, nullable=True)
    technical_feasibility_reason = Column(String, nullable=True)
    market_growth_reason = Column(String, nullable=True)
    pain_point_severity_reason = Column(String, nullable=True)
    monetization_potential_reason = Column(String, nullable=True)

    # Overall metrics
    overall_score = Column(Float, nullable=True)  # Average of 8 dimensions
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("campaign_id", name="uq_validation_score_campaign"),
    )

    campaign = relationship("Campaign", back_populates="validation_scores")


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
    
    # Semantic pipeline fields
    embedding = Column(JSON, nullable=True)
    relevance_score = Column(Float, nullable=True)
    is_relevant = Column(Boolean, nullable=True)

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


class LLMAnalysis(Base):
    __tablename__ = "llm_analysis"
    analysis_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    validation_scores = Column(JSON, nullable=True)
    themes = Column(JSON, nullable=True)
    competitor_analysis = Column(JSON, nullable=True)
    report_text = Column(Text, nullable=True)
    sentiment_results = Column(JSON, nullable=True)
    relevance_stats = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("campaign_id", name="uq_llm_analysis_campaign"),
    )

    campaign = relationship("Campaign", back_populates="llm_analysis")