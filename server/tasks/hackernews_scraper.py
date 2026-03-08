from celery import shared_task

from app.database import SessionLocal
from app import crud, models
from app.ingestion.sources.hackernews.extractor import extract_hackernews_posts
from app.ingestion.sources.hackernews.normalizer import normalize_hackernews_hits


@shared_task(name="tasks.hackernews_scraper.scrape_hackernews_for_campaign")
def scrape_hackernews_for_campaign(campaign_id: int):
    """Celery task to scrape Hacker News posts using campaign keywords."""
    db = SessionLocal()
    try:
        campaign = crud.get_campaign(db, campaign_id)
        if not campaign:
            print(f"Campaign {campaign_id} not found.")
            return f"Campaign {campaign_id} not found"

        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.SCRAPING)

        keyword_objs = crud.get_keywords_by_campaign(db, campaign_id)
        keywords = [k.keyword.strip() for k in keyword_objs if k.keyword and k.keyword.strip()]
        if not keywords:
            return f"No keywords available for campaign {campaign_id}"

        keyword_lookup = {k.keyword.strip().lower(): k.keyword_id for k in keyword_objs if k.keyword}

        extracted_rows = extract_hackernews_posts(keywords=keywords, hits_per_keyword=20)
        normalized_rows = normalize_hackernews_hits(
            campaign_id=campaign_id,
            keyword_lookup=keyword_lookup,
            extracted_rows=extracted_rows,
        )

        per_keyword_posts: dict[int, int] = {}
        per_keyword_engagement: dict[int, int] = {}
        inserted_hn_rows = 0
        inserted_scraped_rows = 0

        for row in normalized_rows:
            keyword_id = row.get("keyword_id")

            hn_data = models.HackerNewsData(
                campaign_id=campaign_id,
                keyword_id=keyword_id,
                source_post_id=row["source_post_id"],
                post_url=row["post_url"],
                title=row.get("title"),
                content=row["content"],
                author=row["author"],
                points=int(row.get("points", 0)),
                comments_count=int(row.get("comments_count", 0)),
                engagement_score=int(row.get("engagement_score", 0)),
            )

            created_hn = crud.create_hackernews_data(db, hn_data)
            if created_hn:
                inserted_hn_rows += 1

            campaign_scoped_post_id = f"hn_{campaign_id}_{row['source_post_id']}"

            scraped_data = models.ScrapedData(
                campaign_id=campaign_id,
                keyword_id=keyword_id,
                platform=models.Platform.HACKER_NEWS,
                post_id=campaign_scoped_post_id,
                post_url=row["post_url"],
                content=row["content"],
                author=row["author"],
                engagement_score=row["engagement_score"],
            )

            created = crud.create_scraped_data(db, scraped_data)
            if not created:
                continue

            inserted_scraped_rows += 1
            if keyword_id:
                per_keyword_posts[keyword_id] = per_keyword_posts.get(keyword_id, 0) + 1
                per_keyword_engagement[keyword_id] = per_keyword_engagement.get(keyword_id, 0) + int(row["engagement_score"])

        for keyword_id, post_count in per_keyword_posts.items():
            engagement = per_keyword_engagement.get(keyword_id, 0)
            crud.update_keyword_activity(
                db=db,
                keyword_id=keyword_id,
                platform=models.Platform.HACKER_NEWS,
                post_count=post_count,
                engagement_count=engagement,
            )

        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.COMPLETED)
        return (
            f"Hacker News scraping completed for campaign {campaign_id}. "
            f"hackernews_data inserted: {inserted_hn_rows}, "
            f"scraped_data inserted: {inserted_scraped_rows}"
        )

    except Exception as exc:
        print(f"Hacker News scraping error for campaign {campaign_id}: {exc}")
        db.rollback()
        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.FAILED)
        return f"Hacker News scraping failed for campaign {campaign_id}"
    finally:
        db.close()
