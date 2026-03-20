from sqlalchemy.orm import Session
from sqlalchemy import func, desc
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
    """Create a campaign with keywords and platforms. Uses LLM to generate smart keywords."""
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

    # Generate smart keywords via LLM
    try:
        from .keyword_generator import generate_search_keywords
        generated = generate_search_keywords(
            name=campaign.campaign_name,
            description=campaign.description,
            raw_keywords=campaign.keywords,
        )
        db_campaign.generated_keywords = generated
        db.commit()
        print(f"[Campaign {db_campaign.campaign_id}] Generated keywords: {generated}")
    except Exception as e:
        print(f"[Campaign] Keyword generation failed: {e} — using original keywords")
        generated = campaign.keywords

    # Create Keyword rows from generated keywords (scrapers use these)
    for keyword_text in generated:
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


def create_reddit_data(db: Session, data: models.RedditData):
    """Insert a Reddit row if it does not already exist for the campaign."""
    exists = (
        db.query(models.RedditData)
        .filter(models.RedditData.campaign_id == data.campaign_id)
        .filter(models.RedditData.source_post_id == data.source_post_id)
        .first()
    )
    if exists:
        return None

    db.add(data)
    db.commit()
    db.refresh(data)
    return data


def get_reddit_data_for_campaign(
    db: Session,
    campaign_id: int,
    keyword_id: int | None = None,
    limit: int = 200,
):
    """Return Reddit rows for a campaign for source-specific display."""
    q = db.query(models.RedditData).filter(
        models.RedditData.campaign_id == campaign_id
    )

    if keyword_id:
        q = q.filter(models.RedditData.keyword_id == keyword_id)

    return q.order_by(models.RedditData.scraped_at.desc()).limit(limit).all()


def create_hackernews_data(db: Session, data: models.HackerNewsData):
    """Insert a Hacker News row if it does not already exist for the campaign."""
    exists = (
        db.query(models.HackerNewsData)
        .filter(models.HackerNewsData.campaign_id == data.campaign_id)
        .filter(models.HackerNewsData.source_post_id == data.source_post_id)
        .first()
    )
    if exists:
        return None

    db.add(data)
    db.commit()
    db.refresh(data)
    return data


def get_hackernews_data_for_campaign(
    db: Session,
    campaign_id: int,
    keyword_id: int | None = None,
    limit: int = 200,
):
    """Return Hacker News rows for a campaign for source-specific display."""
    q = db.query(models.HackerNewsData).filter(
        models.HackerNewsData.campaign_id == campaign_id
    )

    if keyword_id:
        q = q.filter(models.HackerNewsData.keyword_id == keyword_id)

    return q.order_by(models.HackerNewsData.scraped_at.desc()).limit(limit).all()


def create_product_hunt_data(db: Session, data: models.ProductHuntData):
    """Insert a Product Hunt row if it does not already exist for the campaign."""
    exists = (
        db.query(models.ProductHuntData)
        .filter(models.ProductHuntData.campaign_id == data.campaign_id)
        .filter(models.ProductHuntData.source_product_id == data.source_product_id)
        .first()
    )
    if exists:
        return None

    db.add(data)
    db.commit()
    db.refresh(data)
    return data


def get_product_hunt_data_for_campaign(
    db: Session,
    campaign_id: int,
    keyword_id: int | None = None,
    limit: int = 200,
):
    """Return Product Hunt rows for a campaign for source-specific display."""
    q = db.query(models.ProductHuntData).filter(
        models.ProductHuntData.campaign_id == campaign_id
    )

    if keyword_id:
        q = q.filter(models.ProductHuntData.keyword_id == keyword_id)

    return q.order_by(models.ProductHuntData.scraped_at.desc()).limit(limit).all()


def create_quora_data(db: Session, data: models.QuoraData):
    """Insert a Quora row if it does not already exist for the campaign."""
    exists = (
        db.query(models.QuoraData)
        .filter(models.QuoraData.campaign_id == data.campaign_id)
        .filter(models.QuoraData.source_post_id == data.source_post_id)
        .first()
    )
    if exists:
        return None

    db.add(data)
    db.commit()
    db.refresh(data)
    return data


def get_quora_data_for_campaign(
    db: Session,
    campaign_id: int,
    keyword_id: int | None = None,
    limit: int = 200,
):
    """Return Quora rows for a campaign for source-specific display."""
    q = db.query(models.QuoraData).filter(
        models.QuoraData.campaign_id == campaign_id
    )

    if keyword_id:
        q = q.filter(models.QuoraData.keyword_id == keyword_id)

    return q.order_by(models.QuoraData.scraped_at.desc()).limit(limit).all()


def create_google_play_data(db: Session, data: models.GooglePlayData):
    """Insert a Google Play review row if it does not already exist for the campaign."""
    exists = (
        db.query(models.GooglePlayData)
        .filter(models.GooglePlayData.campaign_id == data.campaign_id)
        .filter(models.GooglePlayData.review_id == data.review_id)
        .first()
    )
    if exists:
        return None

    db.add(data)
    db.commit()
    db.refresh(data)
    return data


def get_google_play_data_for_campaign(
    db: Session,
    campaign_id: int,
    keyword_id: int | None = None,
    limit: int = 200,
):
    """Return Google Play review rows for a campaign for source-specific display."""
    q = db.query(models.GooglePlayData).filter(
        models.GooglePlayData.campaign_id == campaign_id
    )

    if keyword_id:
        q = q.filter(models.GooglePlayData.keyword_id == keyword_id)

    return q.order_by(models.GooglePlayData.scraped_at.desc()).limit(limit).all()



def upsert_search_volume_data(db: Session, data: models.SearchVolumeData):
    """Insert or update search volume data for a keyword in a campaign."""
    existing = (
        db.query(models.SearchVolumeData)
        .filter(models.SearchVolumeData.campaign_id == data.campaign_id)
        .filter(models.SearchVolumeData.keyword_id == data.keyword_id)
        .first()
    )

    if existing:
        # Update existing record
        existing.monthly_volume = data.monthly_volume
        existing.competition = data.competition
        existing.competition_index = data.competition_index
        existing.cpc = data.cpc
        existing.trend_direction = data.trend_direction
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new record
        db.add(data)
        db.commit()
        db.refresh(data)
        return data


def get_search_volume_data_for_campaign(
    db: Session,
    campaign_id: int,
    limit: int = 200,
):
    """Return search volume data for a campaign, ordered by monthly volume descending."""
    return (
        db.query(models.SearchVolumeData)
        .filter(models.SearchVolumeData.campaign_id == campaign_id)
        .order_by(models.SearchVolumeData.monthly_volume.desc())
        .limit(limit)
        .all()
    )


def create_or_update_validation_score(db: Session, validation_score: models.ValidationScore):
    """Insert or update validation scores for a campaign."""
    existing = (
        db.query(models.ValidationScore)
        .filter(models.ValidationScore.campaign_id == validation_score.campaign_id)
        .first()
    )

    if existing:
        # Update existing
        existing.market_size = validation_score.market_size
        existing.demand = validation_score.demand
        existing.problem_clarity = validation_score.problem_clarity
        existing.competitor_gap = validation_score.competitor_gap
        existing.technical_feasibility = validation_score.technical_feasibility
        existing.market_growth = validation_score.market_growth
        existing.pain_point_severity = validation_score.pain_point_severity
        existing.monetization_potential = validation_score.monetization_potential
        existing.market_size_reason = validation_score.market_size_reason
        existing.demand_reason = validation_score.demand_reason
        existing.problem_clarity_reason = validation_score.problem_clarity_reason
        existing.competitor_gap_reason = validation_score.competitor_gap_reason
        existing.technical_feasibility_reason = validation_score.technical_feasibility_reason
        existing.market_growth_reason = validation_score.market_growth_reason
        existing.pain_point_severity_reason = validation_score.pain_point_severity_reason
        existing.monetization_potential_reason = validation_score.monetization_potential_reason
        existing.overall_score = validation_score.overall_score
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new
        db.add(validation_score)
        db.commit()
        db.refresh(validation_score)
        return validation_score


def get_validation_score_for_campaign(db: Session, campaign_id: int):
    """Get validation scores for a campaign."""
    return (
        db.query(models.ValidationScore)
        .filter(models.ValidationScore.campaign_id == campaign_id)
        .first()
    )


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
    return obj


def create_or_update_nlp_analysis(db: Session, analysis_in: schemas.NLPAnalysisCreate) -> models.NLPAnalysis:
    """Upsert NLPAnalysis — update existing row if present, insert if not."""
    existing = get_analysis_by_data_id(db, analysis_in.data_id)
    if existing:
        for key, value in analysis_in.model_dump().items():
            setattr(existing, key, value)
        db.commit()
        return existing
    return create_nlp_analysis(db, analysis_in)


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


def create_google_trends_points_bulk(db: Session, campaign_id: int, points: list[dict]) -> int:
    """Insert or update Google Trends points for a campaign."""
    if not points:
        return 0

    created = 0
    for point in points:
        region = (point.get("region") or "GLOBAL").upper()
        trend_date = point.get("trend_date")
        if not trend_date:
            continue

        existing = (
            db.query(models.GoogleTrendsPoint)
            .filter(models.GoogleTrendsPoint.campaign_id == campaign_id)
            .filter(models.GoogleTrendsPoint.keyword_id == point["keyword_id"])
            .filter(models.GoogleTrendsPoint.region == region)
            .filter(models.GoogleTrendsPoint.trend_date == trend_date)
            .first()
        )

        if existing:
            existing.interest = int(point.get("interest", 0))
            existing.is_partial = bool(point.get("is_partial", False))
            continue

        obj = models.GoogleTrendsPoint(
            campaign_id=campaign_id,
            keyword_id=point["keyword_id"],
            region=region,
            trend_date=trend_date,
            interest=int(point.get("interest", 0)),
            is_partial=bool(point.get("is_partial", False)),
        )
        db.add(obj)
        created += 1

    db.commit()
    return created


def get_google_trends_data_for_campaign(
    db: Session,
    campaign_id: int,
    keyword_id: int | None = None,
    region: str | None = None,
    limit: int = 500,
):
    """Return Google Trends points for a campaign."""
    q = db.query(models.GoogleTrendsPoint).filter(models.GoogleTrendsPoint.campaign_id == campaign_id)

    if keyword_id:
        q = q.filter(models.GoogleTrendsPoint.keyword_id == keyword_id)

    if region:
        region_value = region.upper()
        if region_value in {"GLOBAL", "WORLD", "ALL"}:
            region_value = "GLOBAL"
        q = q.filter(models.GoogleTrendsPoint.region == region_value)

    return q.order_by(models.GoogleTrendsPoint.trend_date.desc()).limit(limit).all()


def get_campaign_pain_points_summary(
    db: Session,
    campaign_id: int,
    platform: models.Platform | None = None,
    limit: int = 20,
):
    """Aggregate pain-point labels detected in NLP analysis for a campaign."""
    q = (
        db.query(models.NLPAnalysis)
        .join(models.ScrapedData, models.ScrapedData.data_id == models.NLPAnalysis.data_id)
        .filter(models.ScrapedData.campaign_id == campaign_id)
    )

    if platform:
        q = q.filter(models.ScrapedData.platform == platform)

    counts: dict[str, int] = {}
    for row in q.all():
        pain_points: list[str] = []

        if isinstance(row.topics, dict):
            topic_points = row.topics.get("pain_points")
            if isinstance(topic_points, list):
                pain_points.extend([str(p).strip() for p in topic_points if str(p).strip()])

        if isinstance(row.keywords_extracted, dict):
            keyword_points = row.keywords_extracted.get("pain_points")
            if isinstance(keyword_points, list):
                pain_points.extend([str(p).strip() for p in keyword_points if str(p).strip()])

        for pain_point in set(pain_points):
            counts[pain_point] = counts.get(pain_point, 0) + 1

    ranked = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    return {
        "pain_points": [{"pain_point": label, "count": count} for label, count in ranked],
        "total_mentions": sum(counts.values()),
    }


def get_campaign_top_authors(
    db: Session,
    campaign_id: int,
    platform: models.Platform | None = None,
    limit: int = 20,
):
    """Return top authors by post count and engagement for a campaign."""
    q = (
        db.query(
            models.ScrapedData.author,
            func.count(models.ScrapedData.data_id).label("posts"),
            func.coalesce(func.sum(models.ScrapedData.engagement_score), 0).label("engagement"),
        )
        .filter(models.ScrapedData.campaign_id == campaign_id)
        .filter(models.ScrapedData.author.isnot(None))
        .group_by(models.ScrapedData.author)
        .order_by(desc("posts"), desc("engagement"), desc(models.ScrapedData.author))
        .limit(limit)
    )

    if platform:
        q = q.filter(models.ScrapedData.platform == platform)

    rows = q.all()
    return [
        {
            "author": str(author),
            "posts": int(posts or 0),
            "engagement": int(engagement or 0),
        }
        for author, posts, engagement in rows
    ]

