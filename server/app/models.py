from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Boolean, ARRAY, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class CampaignStatus(str, enum.Enum):
    PENDING = "pending"
    SCRAPING = "scraping"
    COMPLETED = "completed"
    FAILED = "failed"

class Platform(str, enum.Enum):
    REDDIT = "reddit"
    TWITTER = "twitter"
    QUORA = "quora"

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    CLIENT = "client"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.CLIENT, nullable=False)
    is_active = Column(Boolean, default=True)
    reset_token = Column(String, nullable=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship with campaigns
    campaigns = relationship("Campaign", back_populates="user")

class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text)
    platforms = Column(ARRAY(String), default=["reddit", "twitter", "quora"])  # Selected platforms
    status = Column(Enum(CampaignStatus), default=CampaignStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="campaigns")
    keywords = relationship("Keyword", back_populates="campaign", cascade="all, delete-orphan")
    scraped_data = relationship("ScrapedData", back_populates="campaign")

class Keyword(Base):
    __tablename__ = "keywords"
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    keyword = Column(String, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    campaign = relationship("Campaign", back_populates="keywords")
    activities = relationship("KeywordActivity", back_populates="keyword", cascade="all, delete-orphan")
    scraped_data = relationship("ScrapedData", back_populates="keyword")

class KeywordActivity(Base):
    __tablename__ = "keyword_activities"
    id = Column(Integer, primary_key=True, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.id"), nullable=False, index=True)
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
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.id"), index=True, nullable=True)
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