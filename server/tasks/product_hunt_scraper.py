import requests
import time
import os
from dotenv import load_dotenv
from celery import shared_task
from app.database import SessionLocal
from app import models, crud


load_dotenv()

# Product Hunt API configuration
PRODUCT_HUNT_API_KEY = os.getenv("PRODUCT_HUNT_API_KEY")
PRODUCT_HUNT_API_BASE = "https://api.producthunt.com/v2"


def safe_search_products(query: str, limit: int = 20, retry_count: int = 0) -> list:
    """
    Perform a safe Product Hunt search with retry & rate-limit handling.

    Args:
        query: Search query string
        limit: Number of products to fetch (max 20)
        retry_count: Current retry attempt count

    Returns:
        List of product data dictionaries
    """
    if not PRODUCT_HUNT_API_KEY:
        print("ERROR: PRODUCT_HUNT_API_KEY not set in environment variables")
        return []

    headers = {
        "Authorization": f"Bearer {PRODUCT_HUNT_API_KEY}",
        "Content-Type": "application/json"
    }

    params = {
        "search[query]": query,
        "per_page": min(limit, 20),
        "order": "votes"
    }

    try:
        response = requests.get(
            f"{PRODUCT_HUNT_API_BASE}/products/search",
            headers=headers,
            params=params,
            timeout=15
        )

        if response.status_code == 429:  # Rate limited
            delay = 2 ** retry_count  # Exponential backoff
            delay = min(delay, 30)  # Max 30 seconds
            print(f"Rate limit hit. Waiting {delay} seconds...")
            time.sleep(delay)
            if retry_count < 5:  # Max 5 retries
                return safe_search_products(query, limit, retry_count + 1)
            else:
                print(f"Max retries reached for query: {query}")
                return []

        if response.status_code != 200:
            print(f"Error fetching products for '{query}': {response.status_code} - {response.text[:200]}")
            return []

        data = response.json()
        return data.get("data", [])

    except requests.Timeout:
        print(f"Timeout fetching products for '{query}'")
        return []
    except Exception as e:
        print(f"Unexpected error fetching products for '{query}': {e}")
        return []


@shared_task(name='tasks.product_hunt_scraper.scrape_product_hunt_for_campaign')
def scrape_product_hunt_for_campaign(campaign_id: int):
    """
    Celery task to scrape Product Hunt based on campaign keywords.

    Searches for products matching keywords and stores:
    1. Source-specific data in ProductHuntData table
    2. Generic data in ScrapedData table for NLP analysis
    """
    db = SessionLocal()
    try:
        # Get campaign details from DB
        campaign = crud.get_campaign(db, campaign_id)
        if not campaign:
            print(f"Campaign {campaign_id} not found.")
            return f"Campaign {campaign_id} not found"

        # Check if already completed or scraping to avoid duplicate work
        if campaign.status in [models.CampaignStatus.COMPLETED, models.CampaignStatus.SCRAPING]:
            print(f"Campaign {campaign_id} is already {campaign.status}. Skipping.")
            if campaign.status == models.CampaignStatus.COMPLETED:
                return f"Campaign {campaign_id} already completed"

        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.SCRAPING)

        # Get keywords
        keyword_objs = crud.get_keywords_by_campaign(db, campaign_id)
        keywords = [k.keyword.strip() for k in keyword_objs if k.keyword and k.keyword.strip()]
        if not keywords:
            print(f"No keywords found for campaign {campaign_id}")
            crud.update_campaign_status(db, campaign_id, models.CampaignStatus.COMPLETED)
            return f"No keywords for campaign {campaign_id}"

        # Create keyword lookup for matching products to keywords
        keyword_lookup = {k.keyword.strip().lower(): k.keyword_id for k in keyword_objs if k.keyword}

        print(f"Starting Product Hunt scraping for campaign '{campaign.campaign_name}' with keywords: {keywords}")

        # Process each keyword
        inserted_ph_rows = 0
        inserted_scraped_rows = 0
        per_keyword_products = {}
        per_keyword_engagement = {}

        for keyword in keywords:
            try:
                # Search Product Hunt for products
                products = safe_search_products(query=keyword, limit=20)

                if not products:
                    print(f"No products found on Product Hunt for keyword: {keyword}")
                    continue

                for product in products:
                    try:
                        product_id = str(product.get("id", ""))
                        if not product_id:
                            continue

                        # Check if already exists (duplicate prevention)
                        exists = db.query(models.ProductHuntData).filter(
                            models.ProductHuntData.campaign_id == campaign_id,
                            models.ProductHuntData.source_product_id == product_id
                        ).first()

                        if exists:
                            continue

                        # Extract product data
                        product_name = product.get("name", "")
                        tagline = product.get("tagline", "")
                        description = product.get("description", "") or tagline
                        upvotes = product.get("votes_count", 0) or 0
                        comments_count = product.get("comments_count", 0) or 0
                        product_url = product.get("url", "")
                        category = product.get("category_name", "")

                        # Get maker info
                        maker_data = product.get("maker", {})
                        maker_name = maker_data.get("name", "") if isinstance(maker_data, dict) else ""

                        # Calculate engagement score
                        engagement_score = max(upvotes, 0) + max(comments_count, 0)

                        # Create ProductHuntData record
                        matched_keyword_id = keyword_lookup.get(keyword.lower())
                        ph_data = models.ProductHuntData(
                            campaign_id=campaign_id,
                            keyword_id=matched_keyword_id,
                            source_product_id=product_id,
                            product_name=product_name,
                            tagline=tagline,
                            description=description[:2000] if description else "",
                            product_url=product_url,
                            category=category,
                            upvotes=upvotes,
                            comments_count=comments_count,
                            maker_name=maker_name,
                            engagement_score=engagement_score,
                        )

                        created_ph = crud.create_product_hunt_data(db, ph_data)
                        if created_ph:
                            inserted_ph_rows += 1

                        # Create ScrapedData record for NLP analysis
                        campaign_scoped_post_id = f"ph_{campaign_id}_{product_id}"
                        content = f"Product: {product_name}\nTagline: {tagline}\nDescription: {description}\nCategory: {category}"

                        scraped_data = models.ScrapedData(
                            campaign_id=campaign_id,
                            keyword_id=matched_keyword_id,
                            platform=models.Platform.PRODUCT_HUNT,
                            post_id=campaign_scoped_post_id,
                            post_url=product_url,
                            content=content[:2000],
                            author=maker_name,
                            engagement_score=engagement_score,
                        )

                        created_scraped = crud.create_scraped_data(db, scraped_data)
                        if created_scraped:
                            inserted_scraped_rows += 1
                            if matched_keyword_id:
                                per_keyword_products[matched_keyword_id] = per_keyword_products.get(matched_keyword_id, 0) + 1
                                per_keyword_engagement[matched_keyword_id] = per_keyword_engagement.get(matched_keyword_id, 0) + engagement_score

                    except Exception as e:
                        print(f"Error processing product {product.get('id', 'unknown')}: {e}")
                        continue

                # Rate limiting - Product Hunt recommends 1-2 seconds between requests
                time.sleep(1.5)

            except Exception as e:
                print(f"Error scraping Product Hunt for keyword '{keyword}': {e}")
                continue

        # Update keyword activity statistics
        for keyword_id, product_count in per_keyword_products.items():
            engagement = per_keyword_engagement.get(keyword_id, 0)
            crud.update_keyword_activity(
                db=db,
                keyword_id=keyword_id,
                platform=models.Platform.PRODUCT_HUNT,
                post_count=product_count,
                engagement_count=engagement,
            )

        print(
            f"Finished Product Hunt scraping for campaign {campaign_id}. "
            f"product_hunt_data inserted: {inserted_ph_rows}, "
            f"scraped_data inserted: {inserted_scraped_rows}"
        )

        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.COMPLETED)
        return f"Product Hunt scraping completed for campaign {campaign_id}"

    except Exception as e:
        print(f"Product Hunt scraping error for campaign {campaign_id}: {e}")
        db.rollback()
        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.FAILED)
        return f"Product Hunt scraping failed for campaign {campaign_id}"
    finally:
        db.close()
