from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, crud
from .database import engine, SessionLocal
# Ensure the Celery app (configured with Redis) is loaded before importing tasks
from tasks.celery_worker import celery_app
celery_app.set_default()
from tasks.reddit_scraper import scrape_reddit_for_campaign
from tasks.twitter.scraper import scrape_twitter_for_campaign

#All the db tables are beung created here
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SurgeAI Backend")

# Allow frontend (Vite dev server) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#we are getting the db session here by using this function
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/campaigns/", response_model=schemas.Campaign)
def create_campaign_and_scrape(campaign: schemas.CampaignCreate, db: Session = Depends(get_db)):
    """
    Creates a campaign in the database and triggers a background
    scraping task.
    """
    #Save the campaign to the database
    db_campaign = crud.create_campaign(db=db, campaign=campaign)
    
    #Trigger the Celery background task
    scrape_reddit_for_campaign.delay(db_campaign.id)
    
    return db_campaign

@app.get("/campaigns/{campaign_id}", response_model=schemas.Campaign)
def read_campaign(campaign_id: int, db: Session = Depends(get_db)):
    """
    Retrieves campaign details and status.
    """
    db_campaign = crud.get_campaign(db, campaign_id)
    return db_campaign


@app.get("/campaigns/{campaign_id}/scraped-data", response_model=list[schemas.ScrapedData])
def list_scraped_data(campaign_id: int, db: Session = Depends(get_db)):
    """
    Returns recent scraped data rows for a campaign. Useful for UI polling.
    """
    return crud.get_scraped_data_for_campaign(db, campaign_id, limit=200)


@app.post("/campaigns/{campaign_id}/scrape/twitter", status_code=202)
def trigger_twitter_scrape(campaign_id: int, db: Session = Depends(get_db)):
    """
    Triggers a background Twitter scraping task for an existing campaign.
    Keeps the default Reddit flow untouched.
    """
    campaign = crud.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    scrape_twitter_for_campaign.delay(campaign_id)
    return {"detail": "Twitter scraping started", "campaign_id": campaign_id}