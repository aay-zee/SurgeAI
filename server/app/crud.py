from sqlalchemy.orm import Session
from datetime import datetime
from . import models, schemas
from .auth import get_password_hash, verify_password

# User CRUD operations
def get_user_by_email(db: Session, email: str):
    """Get user by email."""
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    """Get user by ID."""
    return db.query(models.User).filter(models.User.id == user_id).first()

def create_user(db: Session, user: schemas.UserCreate):
    """Create a new user with hashed password."""
    # Check if user already exists
    db_user = get_user_by_email(db, email=user.email)
    if db_user:
        return None  # User already exists
    
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
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
    if not verify_password(password, user.hashed_password):
        return False
    return user

def update_user_password(db: Session, user: models.User, new_password: str):
    """Update user password."""
    user.hashed_password = get_password_hash(new_password)
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
    query = db.query(models.Campaign).filter(models.Campaign.id == campaign_id)
    if user_id:
        query = query.filter(models.Campaign.user_id == user_id)
    return query.first()

def create_campaign(db: Session, campaign: schemas.CampaignCreate, user_id: int):
    """Create a campaign associated with a user."""
    db_campaign = models.Campaign(**campaign.model_dump(), user_id=user_id)
    db.add(db_campaign)
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


def get_scraped_data_for_campaign(db: Session, campaign_id: int, limit: int = 100):
    """Return recent scraped rows for a given campaign id."""
    q = (
        db.query(models.ScrapedData)
        .filter(models.ScrapedData.campaign_id == campaign_id)
        .order_by(models.ScrapedData.scraped_at.desc())
        .limit(limit)
    )
    return q.all()