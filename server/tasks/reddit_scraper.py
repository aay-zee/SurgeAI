import praw
import os
from dotenv import load_dotenv
from celery import shared_task
from app.database import SessionLocal
from app import models, crud

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
    Links scraped data to specific keywords and tracks activity.
    """
    db = SessionLocal()
    try:
        # 1. Get campaign details from DB
        campaign = crud.get_campaign(db, campaign_id)
        if not campaign:
            print(f"Campaign {campaign_id} not found.")
            return

        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.SCRAPING)
        
        # 2. Get keywords from Keyword table
        keywords = crud.get_keywords_by_campaign(db, campaign_id)
        if not keywords:
            print(f"No keywords found for campaign {campaign_id}")
            crud.update_campaign_status(db, campaign_id, models.CampaignStatus.COMPLETED)
            return
        
        print(f"Starting Reddit scraping for campaign '{campaign.name}' with {len(keywords)} keywords")

        # 3. Scrape Reddit for each keyword individually
        subreddits = ["startups", "SideProject", "smallbusiness", "Entrepreneur"]
        
        for keyword_obj in keywords:
            keyword = keyword_obj.keyword
            print(f"Scraping for keyword: {keyword}")
            
            post_count = 0
            engagement_count = 0
            
            # Search for this specific keyword
            search_query = f'"{keyword}"'
            
            for sub_name in subreddits:
                try:
                    subreddit = reddit.subreddit(sub_name)
                    # Limit to 10 posts per subreddit per keyword
                    for submission in subreddit.search(search_query, limit=10, sort="new"):
                        if not submission.is_self:  # Skip link posts
                            continue

                        # Calculate engagement score (upvotes + comments)
                        engagement_score = submission.score + submission.num_comments

                        # Create ScrapedData object linked to keyword
                        scraped_data = models.ScrapedData(
                            campaign_id=campaign_id,
                            keyword_id=keyword_obj.id,  # Link to specific keyword
                            platform=models.Platform.REDDIT,
                            post_id=submission.id,
                            post_url=f"https://reddit.com{submission.permalink}",
                            content=f"Title: {submission.title}\n\n{submission.selftext}",
                            author=str(submission.author) if submission.author else "Unknown",
                            engagement_score=engagement_score
                        )
                        
                        if crud.create_scraped_data(db, scraped_data):
                            post_count += 1
                            engagement_count += engagement_score
                
                except Exception as e:
                    print(f"Error scraping subreddit {sub_name} for keyword {keyword}: {e}")
                    continue
            
            # Update keyword activity for Reddit
            if post_count > 0:
                crud.update_keyword_activity(
                    db, keyword_obj.id, models.Platform.REDDIT,
                    post_count, engagement_count
                )
                print(f"Updated activity for keyword '{keyword}': {post_count} posts, {engagement_count} engagement")
        
        print(f"Finished scraping for campaign {campaign_id}")
        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.COMPLETED)

    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()
        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.FAILED)
    finally:
        db.close()

    return f"Scraping completed for campaign {campaign_id}"