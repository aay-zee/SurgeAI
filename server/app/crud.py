from sqlalchemy.orm import Session
from . import models, schemas

def get_campaign(db: Session, campaign_id: int):
    return db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()

def create_campaign(db: Session, campaign: schemas.CampaignCreate):
    db_campaign = models.Campaign(**campaign.model_dump())
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