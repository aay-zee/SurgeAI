import praw
import os
from dotenv import load_dotenv
from celery import shared_task
from app.database import SessionLocal
from app import models, crud
from .nlp_analysis import run_sentiment_for_campaign

load_dotenv()

# Initialize PRAW
reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
    user_agent=os.getenv("REDDIT_USER_AGENT"),
)

@shared_task(name='tasks.reddit_scraper.scrape_reddit_for_campaign')
def scrape_reddit_for_campaign(campaign_id: int):
    """
    Celery task to scrape Reddit based on campaign keywords.
    """
    db = SessionLocal()
    try:
        # 1. Get campaign details from DB
        campaign = crud.get_campaign(db, campaign_id)
        if not campaign:
            print(f"Campaign {campaign_id} not found.")
            return

        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.SCRAPING)
        # keywords = campaign.keywords.split(',') # Old way
        # New way: access keywords properly via relationship
        keyword_objs = crud.get_keywords_by_campaign(db, campaign_id)
        keywords = [k.keyword for k in keyword_objs]
        print(f"Starting scraping for campaign '{campaign.campaign_name}' with keywords: {keywords}")

        # 2. Scrape Reddit
        # Combining keywords with OR for a broader search
        search_query = " OR ".join([f'"{k.strip()}"' for k in keywords])
        
        # Search in a few relevant subreddits
        subreddits = ["startups", "SideProject", "smallbusiness", "Entrepreneur"]
        
        for sub_name in subreddits:
            subreddit = reddit.subreddit(sub_name)
            # Limit to 10 posts per subreddit for this example
            for submission in subreddit.search(search_query, limit=10, sort="new"):
                if not submission.is_self: # Skip link posts
                    continue

                # 3. Create ScrapedData object and save to DB
                scraped_data = models.ScrapedData(
                    campaign_id=campaign_id,
                    platform=models.Platform.REDDIT,
                    post_id=submission.id,
                    post_url=submission.permalink,
                    content=f"Title: {submission.title}\n\n{submission.selftext}",
                    author=str(submission.author)
                )
                
                crud.create_scraped_data(db, scraped_data)
        
            print(f"Finished scraping for campaign {campaign_id}")
            
        # Trigger NLP sentiment analysis for this campaign
        run_sentiment_for_campaign.delay(campaign_id)
        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.COMPLETED)

    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback() # Fix for "current transaction is aborted"
        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.FAILED)
    finally:
        db.close()

    return f"Scraping completed for campaign {campaign_id}"