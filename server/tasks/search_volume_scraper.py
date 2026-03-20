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
    Fetch search volume signals for a keyword using SerpAPI Google Search.
    Uses multi-signal approach: ads, related searches, AI overview, shopping results,
    organic result count — because SerpAPI's total_results is unreliable (returns
    page count, not Google's actual index size).
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

        # ── Multi-signal volume estimation ────────────────────────────────────
        # SerpAPI's total_results reflects page count (unreliable), so we score
        # the response using multiple quality signals instead.

        ads              = data.get("ads", [])
        related_searches = data.get("related_searches", [])
        organic_results  = data.get("organic_results", [])
        shopping_results = data.get("shopping_results", [])
        has_ai_overview  = "ai_overview" in data
        has_knowledge    = "knowledge_graph" in data
        has_inline_vids  = "inline_videos" in data

        ads_count      = len(ads)
        related_count  = len(related_searches)
        organic_count  = len(organic_results)
        shopping_count = len(shopping_results)

        # Build a demand score (0–100) from weighted signals
        demand_score = 0
        demand_score += min(ads_count * 12, 36)        # ads = strong commercial intent (max 36)
        demand_score += min(related_count * 3, 24)     # related searches = topic breadth (max 24)
        demand_score += min(shopping_count * 4, 16)    # shopping = purchase intent (max 16)
        demand_score += 10 if has_ai_overview else 0   # AI overview = high-traffic query
        demand_score += 8  if has_knowledge   else 0   # Knowledge graph = well-known topic
        demand_score += 6  if has_inline_vids else 0   # Inline videos = rich/popular topic

        print(f"[SearchVolume] '{keyword}' | ads={ads_count} related={related_count} "
              f"shopping={shopping_count} ai_overview={has_ai_overview} "
              f"knowledge={has_knowledge} -> demand_score={demand_score}")

        # Map demand score to monthly volume estimate
        if demand_score >= 80:
            monthly_volume   = 110000
            competition      = "HIGH"
            competition_index = 92
        elif demand_score >= 60:
            monthly_volume   = 60000
            competition      = "HIGH"
            competition_index = 78
        elif demand_score >= 45:
            monthly_volume   = 25000
            competition      = "HIGH"
            competition_index = 65
        elif demand_score >= 30:
            monthly_volume   = 10000
            competition      = "MEDIUM"
            competition_index = 50
        elif demand_score >= 20:
            monthly_volume   = 4000
            competition      = "MEDIUM"
            competition_index = 35
        elif demand_score >= 10:
            monthly_volume   = 1500
            competition      = "LOW"
            competition_index = 20
        else:
            monthly_volume   = 400
            competition      = "LOW"
            competition_index = 8

        # Trend direction: related searches + video/AI signals
        if related_count >= 8 or (has_ai_overview and related_count >= 5):
            trend_direction = "rising"
        elif related_count >= 4 or has_ai_overview:
            trend_direction = "stable"
        else:
            trend_direction = "falling"

        # CPC: real if ads present, estimated from competition otherwise
        if ads_count > 0:
            cpc = round(0.8 + ads_count * 0.5, 2)
        elif competition == "HIGH":
            cpc = round(1.5 + shopping_count * 0.3, 2)
        elif competition == "MEDIUM":
            cpc = round(0.6, 2)
        else:
            cpc = None

        return {
            "monthly_volume":   monthly_volume,
            "competition":      competition,
            "competition_index": competition_index,
            "cpc":              cpc,
            "trend_direction":  trend_direction,
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
