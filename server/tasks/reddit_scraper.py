import praw
import prawcore
import time
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

def safe_search(subreddit, query, limit=10, sort="new"):
    """Perform a safe Reddit search with retry & rate-limit handling."""
    delay = 1  # start with 1 second delay

    while True:
        try:
            return list(subreddit.search(query, limit=limit, sort=sort))
        except prawcore.exceptions.TooManyRequests as e:
            # If sleep_time is available, use it; otherwise default to a short wait
            sleep_time = getattr(e, 'sleep_time', None)
            if sleep_time:
                print(f"Rate limit hit. Waiting {sleep_time} seconds...")
                time.sleep(sleep_time + 1)
            else:
                print(f"Rate limit hit. Waiting {delay} seconds...")
                time.sleep(delay)
                delay = min(delay * 2, 30)
        except Exception as e:
            print(f"Unexpected error: {e}, retrying in {delay}s...")
            time.sleep(delay)
            delay = min(delay * 2, 30)  # exponential backoff, max 30 sec

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

        # Check if already completed or scraping to avoid duplicate work
        if campaign.status in [models.CampaignStatus.COMPLETED, models.CampaignStatus.SCRAPING]:
             print(f"Campaign {campaign_id} is already {campaign.status}. Skipping.")
             # We might return here if we want to be strict, but let's proceed if it's just 'SCRAPING' 
             # and we suspect it crashed or is a retry. 
             # However, for rate limit issues caused by loop, returning here is safer.
             if campaign.status == models.CampaignStatus.COMPLETED:
                 return

        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.SCRAPING)
        
        keyword_objs = crud.get_keywords_by_campaign(db, campaign_id)
        keywords = [k.keyword for k in keyword_objs]
        print(f"Starting scraping for campaign '{campaign.campaign_name}' with keywords: {keywords}")

        # 1. Build the search query
        search_query = " OR ".join([f'"{k.strip()}"' for k in keywords])

        # 2. Combine subreddits → SINGLE API REQUEST
        # Note: subreddit names should be separated by '+'
        combined_subreddits = "startups+SideProject+smallbusiness+Entrepreneur"
        subreddit = reddit.subreddit(combined_subreddits)

        # 3. Safe search (handles rate limits + retries)
        posts = safe_search(subreddit, search_query, limit=10, sort="new")

        # 4. Process posts
        for submission in posts:
            if not submission.is_self:
                continue

            # Create ScrapedData object and save to DB
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