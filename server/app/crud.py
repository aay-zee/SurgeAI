from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from . import models, schemas
from .auth import get_password_hash, verify_password

# User CRUD operations
def get_user_by_email(db: Session, email: str):
    """Get user by email."""
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    """Get user by ID."""
    return db.query(models.User).filter(models.User.user_id == user_id).first()

def create_user(db: Session, user: schemas.UserCreate):
    """Create a new user with hashed password."""
    # Check if user already exists
    db_user = get_user_by_email(db, email=user.email)
    if db_user:
        return None  # User already exists
    
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        role=models.UserRole.CLIENT,  # All signups are CLIENT role by default
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str):
    """Authenticate user by verifying email and password."""
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user

def update_user_password(db: Session, user: models.User, new_password: str):
    """Update user password."""
    user.password_hash = get_password_hash(new_password)
    db.commit()
    db.refresh(user)
    return user

def set_reset_token(db: Session, user: models.User, token: str, expires_at: datetime):
    """Set password reset token for user."""
    user.reset_token = token
    user.reset_token_expires_at = expires_at
    db.commit()
    db.refresh(user)
    return user

def clear_reset_token(db: Session, user: models.User):
    """Clear password reset token from user."""
    user.reset_token = None
    user.reset_token_expires_at = None
    db.commit()
    db.refresh(user)
    return user

# Campaign CRUD operations (updated)
def get_campaign(db: Session, campaign_id: int, user_id: int | None = None):
    """Get campaign by ID, optionally filtered by user_id."""
    query = db.query(models.Campaign).filter(models.Campaign.campaign_id == campaign_id)
    if user_id:
        query = query.filter(models.Campaign.user_id == user_id)
    return query.first()

def create_campaign(db: Session, campaign: schemas.CampaignCreate, user_id: int):
    """Create a campaign with keywords and platforms."""
    # Convert Platform enum to string list
    platforms_list = [p.value for p in campaign.platforms]
    
    db_campaign = models.Campaign(
        campaign_name=campaign.campaign_name,
        description=campaign.description,
        keywords_text=",".join(campaign.keywords),
        platforms=platforms_list,
        user_id=user_id
    )
    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)
    
    # Create keywords
    for keyword_text in campaign.keywords:
        keyword = models.Keyword(
            campaign_id=db_campaign.campaign_id,
            keyword=keyword_text.strip()
        )
        db.add(keyword)
    
    db.commit()
    db.refresh(db_campaign)
    return db_campaign

def update_campaign_status(db: Session, campaign_id: int, status: models.CampaignStatus):
    campaign = get_campaign(db, campaign_id)
    if campaign:
        campaign.status = status
        db.commit()
        db.refresh(campaign)
    return campaign

def create_scraped_data(db: Session, data: models.ScrapedData):
    #check if data already exists to avoid duplicates
    exists = db.query(models.ScrapedData).filter(models.ScrapedData.post_id == data.post_id).first()
    if not exists:
        db.add(data)
        db.commit()
        db.refresh(data)
        return data
    return None


def get_scraped_data_for_campaign(
    db: Session, 
    campaign_id: int, 
    keyword_id: int | None = None,
    platform: models.Platform | None = None,
    limit: int = 100
):
    """Return recent scraped rows for a given campaign id."""
    q = db.query(models.ScrapedData).filter(
        models.ScrapedData.campaign_id == campaign_id
    )
    
    if keyword_id:
        q = q.filter(models.ScrapedData.keyword_id == keyword_id)
    
    if platform:
        q = q.filter(models.ScrapedData.platform == platform)
    
    return q.order_by(models.ScrapedData.scraped_at.desc()).limit(limit).all()

# Keyword CRUD operations
def create_keyword(db: Session, campaign_id: int, keyword: str):
    """Create a single keyword for a campaign."""
    db_keyword = models.Keyword(
        campaign_id=campaign_id,
        keyword=keyword.strip()
    )
    db.add(db_keyword)
    db.commit()
    db.refresh(db_keyword)
    return db_keyword

def create_keywords_bulk(db: Session, campaign_id: int, keywords: list[str]):
    """Create multiple keywords for a campaign."""
    db_keywords = []
    for keyword_text in keywords:
        keyword = models.Keyword(
            campaign_id=campaign_id,
            keyword=keyword_text.strip()
        )
        db.add(keyword)
        db_keywords.append(keyword)
    db.commit()
    for keyword in db_keywords:
        db.refresh(keyword)
    return db_keywords

def get_keyword(db: Session, keyword_id: int):
    """Get keyword by ID."""
    return db.query(models.Keyword).filter(models.Keyword.keyword_id == keyword_id).first()

def get_keywords_by_campaign(db: Session, campaign_id: int):
    """Get all keywords for a campaign."""
    return db.query(models.Keyword).filter(
        models.Keyword.campaign_id == campaign_id
    ).all()

def delete_keyword(db: Session, keyword_id: int):
    """Delete a keyword."""
    keyword = get_keyword(db, keyword_id)
    if keyword:
        db.delete(keyword)
        db.commit()
        return True
    return False

# Keyword Activity CRUD operations
def get_keyword_activity(
    db: Session, 
    keyword_id: int, 
    platform: models.Platform
):
    """Get keyword activity for a specific platform."""
    return db.query(models.KeywordActivity).filter(
        models.KeywordActivity.keyword_id == keyword_id,
        models.KeywordActivity.platform == platform
    ).first()

def get_all_keyword_activities(db: Session, keyword_id: int):
    """Get all platform activities for a keyword."""
    return db.query(models.KeywordActivity).filter(
        models.KeywordActivity.keyword_id == keyword_id
    ).all()

def update_keyword_activity(
    db: Session,
    keyword_id: int,
    platform: models.Platform,
    post_count: int,
    engagement_count: int
):
    """Update or create keyword activity for a platform."""
    activity = get_keyword_activity(db, keyword_id, platform)
    if activity:
        activity.post_count = post_count
        activity.engagement_count = engagement_count
        activity.last_updated = datetime.utcnow()
    else:
        activity = models.KeywordActivity(
            keyword_id=keyword_id,
            platform=platform,
            post_count=post_count,
            engagement_count=engagement_count
        )
        db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity

def get_keyword_stats(db: Session, keyword_id: int):
    """Get comprehensive stats for a keyword across all platforms."""
    keyword = get_keyword(db, keyword_id)
    if not keyword:
        return None
    
    activities = get_all_keyword_activities(db, keyword_id)
    
    platform_stats = {}
    total_posts = 0
    total_engagement = 0
    
    for activity in activities:
        platform_stats[activity.platform.value] = {
            "posts": activity.post_count,
            "engagement": activity.engagement_count
        }
        total_posts += activity.post_count
        total_engagement += activity.engagement_count
    
    return {
        "keyword_id": keyword_id,
        "keyword": keyword.keyword,
        "total_posts": total_posts,
        "total_engagement": total_engagement,
        "platform_stats": platform_stats
    }

def get_keyword_rankings(
    db: Session, 
    campaign_id: int, 
    platform: models.Platform | None = None
):
    """Get ranked keywords for a campaign, optionally filtered by platform."""
    keywords = get_keywords_by_campaign(db, campaign_id)
    
    keyword_stats = []
    for keyword in keywords:
        activities = db.query(models.KeywordActivity).filter(
            models.KeywordActivity.keyword_id == keyword.keyword_id
        )
        
        if platform:
            activities = activities.filter(
                models.KeywordActivity.platform == platform
            )
        
        activities = activities.all()
        
        total_posts = sum(a.post_count for a in activities)
        total_engagement = sum(a.engagement_count for a in activities)
        
        platform_stats = {
            a.platform.value: {
                "posts": a.post_count,
                "engagement": a.engagement_count
            } for a in activities
        }
        
        keyword_stats.append({
            "keyword_id": keyword.keyword_id,
            "keyword": keyword.keyword,
            "total_posts": total_posts,
            "total_engagement": total_engagement,
            "platform_stats": platform_stats
        })
    
    # Rank by total engagement (descending)
    keyword_stats.sort(key=lambda x: x["total_engagement"], reverse=True)
    for i, stat in enumerate(keyword_stats, 1):
        stat["rank"] = i
    
    return keyword_stats

def get_scraped_data_by_keyword_and_platform(
    db: Session,
    keyword_id: int,
    platform: models.Platform | None = None,
    limit: int = 100
):
    """Get scraped data for a keyword, optionally filtered by platform."""
    query = db.query(models.ScrapedData).filter(
        models.ScrapedData.keyword_id == keyword_id
    )
    
    if platform:
        query = query.filter(models.ScrapedData.platform == platform)
    
    return query.order_by(models.ScrapedData.scraped_at.desc()).limit(limit).all()

def get_all_campaigns(db: Session, user_id: int | None = None):
    """Get all campaigns, optionally filtered by user."""
    query = db.query(models.Campaign)
    if user_id:
        query = query.filter(models.Campaign.user_id == user_id)
    return query.order_by(models.Campaign.created_at.desc()).all()

def update_campaign(db: Session, campaign_id: int, campaign_update: dict, user_id: int | None = None):
    """Update campaign details."""
    campaign = get_campaign(db, campaign_id, user_id)
    if not campaign:
        return None
    
    for key, value in campaign_update.items():
        if hasattr(campaign, key):
            setattr(campaign, key, value)
    
    db.commit()
    db.refresh(campaign)
    return campaign

def delete_campaign(db: Session, campaign_id: int, user_id: int | None = None):
    """Delete a campaign."""
    campaign = get_campaign(db, campaign_id, user_id)
    if campaign:
        db.delete(campaign)
        db.commit()
        return True
    return False

# NLP Analysis CRUD operations
def create_nlp_analysis(db: Session, analysis_in: schemas.NLPAnalysisCreate) -> models.NLPAnalysis:
    """Insert a new NLPAnalysis row."""
    obj = models.NLPAnalysis(**analysis_in.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_analysis_by_data_id(db: Session, data_id: int) -> models.NLPAnalysis | None:
    return db.query(models.NLPAnalysis).filter(models.NLPAnalysis.data_id == data_id).first()


def get_unanalysed_scraped_data_for_campaign(db: Session, campaign_id: int, limit: int = 100):
    """Return scraped data for a campaign where no NLPAnalysis exists yet."""
    q = (
        db.query(models.ScrapedData)
        .outerjoin(models.NLPAnalysis, models.NLPAnalysis.data_id == models.ScrapedData.data_id)
        .filter(models.ScrapedData.campaign_id == campaign_id)
        .filter(models.NLPAnalysis.analysis_id.is_(None))
        .order_by(models.ScrapedData.scraped_at.desc())
        .limit(limit)
    )
    return q.all()


def get_latest_validation_result(db: Session, campaign_id: int):
    """Return the most recently generated ValidationResult for a campaign."""
    return (
        db.query(models.ValidationResult)
        .filter(models.ValidationResult.campaign_id == campaign_id)
        .order_by(models.ValidationResult.generated_at.desc())
        .first()
    )


def get_campaign_sentiment_summary(db: Session, campaign_id: int):
    """Aggregate counts and percentages of sentiment per campaign."""
    total_q = (
        db.query(func.count(models.NLPAnalysis.analysis_id))
        .join(models.ScrapedData, models.ScrapedData.data_id == models.NLPAnalysis.data_id)
        .filter(models.ScrapedData.campaign_id == campaign_id)
    )
    total = total_q.scalar() or 0

    counts_q = (
        db.query(models.NLPAnalysis.sentiment_label, func.count(models.NLPAnalysis.analysis_id))
        .join(models.ScrapedData, models.ScrapedData.data_id == models.NLPAnalysis.data_id)
        .filter(models.ScrapedData.campaign_id == campaign_id)
        .group_by(models.NLPAnalysis.sentiment_label)
    )

    counts = {"positive": 0, "neutral": 0, "negative": 0}
    for label, cnt in counts_q.all():
        counts[str(label)] = cnt

    def pct(c):
        return (c / total * 100.0) if total > 0 else 0.0

    summary = {
        "counts": counts,
        "percentages": {k: pct(v) for k, v in counts.items()},
        "total": total,
    }
    return summary

