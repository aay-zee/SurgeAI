from celery import shared_task
from app.database import SessionLocal
from app import crud
from app.ingestion.sources.google_trends.client import create_google_trends_client
from app.ingestion.sources.google_trends.extractor import fetch_interest_over_time
from app.ingestion.sources.google_trends.normalizer import normalize_interest_over_time_rows


@shared_task(name="tasks.google_trends_scraper.scrape_google_trends_for_campaign")
def scrape_google_trends_for_campaign(campaign_id: int, region: str | None = None):
    """Celery task to fetch Google Trends time-series data for campaign keywords."""
    db = SessionLocal()
    try:
        campaign = crud.get_campaign(db, campaign_id)
        if not campaign:
            return f"Campaign {campaign_id} not found"

        keyword_objs = crud.get_keywords_by_campaign(db, campaign_id)
        if not keyword_objs:
            return f"No keywords for campaign {campaign_id}"

        keywords = [k.keyword.strip() for k in keyword_objs if k.keyword and k.keyword.strip()]
        if not keywords:
            return f"No valid keywords for campaign {campaign_id}"

        keyword_lookup = {k.keyword.strip().lower(): k.keyword_id for k in keyword_objs if k.keyword}

        trends_client = create_google_trends_client()
        extracted_rows = fetch_interest_over_time(
            trends_client=trends_client,
            keywords=keywords,
            region=region,
            timeframe="today 12-m",
        )

        normalized_rows = normalize_interest_over_time_rows(
            campaign_id=campaign_id,
            keyword_lookup=keyword_lookup,
            extracted_rows=extracted_rows,
            region=region,
        )

        created_count = crud.create_google_trends_points_bulk(
            db=db,
            campaign_id=campaign_id,
            points=normalized_rows,
        )

        return (
            f"Google Trends ingestion completed for campaign {campaign_id}. "
            f"Stored/updated rows: {created_count}"
        )

    except Exception as exc:
        db.rollback()
        print(f"Google Trends task error for campaign {campaign_id}: {exc}")
        return f"Google Trends ingestion failed for campaign {campaign_id}"
    finally:
        db.close()
