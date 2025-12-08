from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Boolean
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
    keywords = Column(Text, nullable=False) # Simple text field for keywords for now
    status = Column(Enum(CampaignStatus), default=CampaignStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Relationship with user
    user = relationship("User", back_populates="campaigns")

class ScrapedData(Base):
    __tablename__ = "scraped_data"
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), index=True)
    platform = Column(Enum(Platform), nullable=False)
    post_id = Column(String, unique=True, index=True)
    post_url = Column(String)
    content = Column(Text)
    author = Column(String)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())