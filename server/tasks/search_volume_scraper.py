import requests
import time
import re
import os
from dotenv import load_dotenv
from celery import shared_task
from app.database import SessionLocal
from app import models, crud

load_dotenv()

SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")
SERPAPI_BASE = "https://serpapi.com/search"


def safe_fetch_search_volume(keyword: str, api_key: str = "", retry_count: int = 0) -> dict:
    """
    Fetch search volume proxy for a keyword using SerpAPI Google Search.
    Uses total_results count and related searches as volume/competition signals.
    Returns dict: {monthly_volume, competition, competition_index, cpc, trend_direction}
    """
    if not api_key:
        print(f"Warning: No SERPAPI_KEY set. Cannot fetch search volume for '{keyword}'")
        return {}

    params = {
        "engine": "google",
        "q": keyword,
        "api_key": api_key,
        "num": 10,
        "gl": "us",
        "hl": "en",
    }

    try:
        response = requests.get(SERPAPI_BASE, params=params, timeout=20)

        if response.status_code == 429:
            delay = min(2 ** retry_count, 30)
            print(f"Rate limit hit. Waiting {delay} seconds...")
            time.sleep(delay)
            if retry_count < 3:
                return safe_fetch_search_volume(keyword, api_key, retry_count + 1)
            else:
                print(f"Max retries reached for keyword: {keyword}")
                return {}

        if response.status_code == 402:
            print("SerpAPI quota exceeded. No more API credits available.")
            return {}

        if response.status_code != 200:
            print(f"Error fetching search volume for '{keyword}': {response.status_code}")
            return {}

        data = response.json()

        if "error" in data:
            print(f"SerpAPI error for '{keyword}': {data['error']}")
            return {}

        # Extract total results as a volume proxy
        search_info = data.get("search_information", {})
        total_results = search_info.get("total_results", 0)

        # Map total_results to a monthly volume estimate
        # Google total_results is a rough proxy: higher results = more interest
        if total_results > 1_000_000_000:
            monthly_volume = 100000
            competition = "HIGH"
            competition_index = 90
        elif total_results > 100_000_000:
            monthly_volume = 50000
            competition = "HIGH"
            competition_index = 75
        elif total_results > 10_000_000:
            monthly_volume = 10000
            competition = "MEDIUM"
            competition_index = 50
        elif total_results > 1_000_000:
            monthly_volume = 5000
            competition = "MEDIUM"
            competition_index = 35
        elif total_results > 100_000:
            monthly_volume = 1000
            competition = "LOW"
            competition_index = 20
        elif total_results > 10_000:
            monthly_volume = 500
            competition = "LOW"
            competition_index = 10
        else:
            monthly_volume = max(100, total_results // 100)
            competition = "LOW"
            competition_index = 5

        # Check related searches for trend signals
        related_searches = data.get("related_searches", [])
        related_count = len(related_searches) if related_searches else 0

        # More related searches suggests a rising/active topic
        if related_count >= 8:
            trend_direction = "rising"
        elif related_count >= 4:
            trend_direction = "stable"
        else:
            trend_direction = "falling"

        # Extract CPC from ads if present (real ad data)
        ads = data.get("ads", [])
        cpc = None
        if ads:
            # Presence of ads suggests commercial intent; estimate CPC
            cpc = round(0.5 + len(ads) * 0.3, 2)

        return {
            "monthly_volume": monthly_volume,
            "competition": competition,
            "competition_index": competition_index,
            "cpc": cpc,
            "trend_direction": trend_direction,
        }

    except requests.Timeout:
        print(f"Timeout fetching search volume for '{keyword}'")
        return {}
    except Exception as e:
        print(f"Unexpected error fetching search volume for '{keyword}': {e}")
        return {}


@shared_task(name='tasks.search_volume_scraper.scrape_search_volume_for_campaign')
def scrape_search_volume_for_campaign(campaign_id: int):
    """
    Celery task: fetches search volume for all campaign keywords.
    Writes to SearchVolumeData table (quantitative market data, no NLP analysis).
    """
    db = SessionLocal()
    try:
        campaign = crud.get_campaign(db, campaign_id)
        if not campaign:
            return f"Campaign {campaign_id} not found"

        if campaign.status in [models.CampaignStatus.COMPLETED, models.CampaignStatus.SCRAPING]:
            if campaign.status == models.CampaignStatus.COMPLETED:
                return f"Campaign {campaign_id} already completed"

        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.SCRAPING)

        keyword_objs = crud.get_keywords_by_campaign(db, campaign_id)
        keywords = [k.keyword.strip() for k in keyword_objs if k.keyword and k.keyword.strip()]
        if not keywords:
            crud.update_campaign_status(db, campaign_id, models.CampaignStatus.COMPLETED)
            return f"No keywords for campaign {campaign_id}"

        if not SERPAPI_KEY:
            print(f"Warning: SERPAPI_KEY not set. Skipping search volume scraping for campaign {campaign_id}")
            crud.update_campaign_status(db, campaign_id, models.CampaignStatus.COMPLETED)
            return f"Skipped: No SERPAPI_KEY configured"

        inserted_sv_rows = 0
        per_keyword_volumes = {}

        for keyword in keywords:
            try:
                volume_data = safe_fetch_search_volume(keyword, SERPAPI_KEY)
                if not volume_data:
                    continue

                # Find the keyword object
                keyword_obj = next((k for k in keyword_objs if k.keyword.strip().lower() == keyword.lower()), None)
                if not keyword_obj:
                    continue

                # Upsert: create or update search volume data for this keyword
                sv_data = models.SearchVolumeData(
                    campaign_id=campaign_id,
                    keyword_id=keyword_obj.keyword_id,
                    keyword=keyword,
                    monthly_volume=volume_data.get("monthly_volume", 0),
                    competition=volume_data.get("competition"),
                    competition_index=volume_data.get("competition_index"),
                    cpc=volume_data.get("cpc"),
                    trend_direction=volume_data.get("trend_direction"),
                )

                created_sv = crud.upsert_search_volume_data(db, sv_data)
                if created_sv:
                    inserted_sv_rows += 1
                    per_keyword_volumes[keyword_obj.keyword_id] = volume_data.get("monthly_volume", 0)

                time.sleep(1.5)  # rate-limit between requests

            except Exception as e:
                print(f"Error fetching search volume for keyword '{keyword}': {e}")
                continue

        # Update KeywordActivity with volume as post_count
        for keyword_id, volume in per_keyword_volumes.items():
            # Use volume as engagement proxy (higher volume = higher engagement weight)
            engagement_proxy = min(volume // 1000, 999)  # Cap at 999 for database int field
            crud.update_keyword_activity(
                db=db,
                keyword_id=keyword_id,
                platform=models.Platform.SEARCH_VOLUME,
                post_count=min(volume, 999999),  # Cap to prevent int overflow
                engagement_count=engagement_proxy,
            )

        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.COMPLETED)
        return f"Search volume scraping completed for campaign {campaign_id}: {inserted_sv_rows} keywords processed"

    except Exception as e:
        print(f"Search volume scraping error for campaign {campaign_id}: {e}")
        db.rollback()
        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.FAILED)
        return f"Search volume scraping failed for campaign {campaign_id}"
    finally:
        db.close()
