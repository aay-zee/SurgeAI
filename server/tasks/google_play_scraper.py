import time
from celery import shared_task
from app.database import SessionLocal
from app import models, crud


def safe_search_apps(query: str, n_hits: int = 5, retry_count: int = 0) -> list:
    try:
        from google_play_scraper import search
        raw = search(query, n_hits=n_hits, lang='en', country='us')
        results = raw[0] if isinstance(raw, tuple) else raw
        return results if results else []
    except Exception as e:
        if retry_count < 3:
            delay = min(2 ** retry_count, 15)
            print(f"Error searching Play Store for '{query}'. Retrying in {delay}s: {e}")
            time.sleep(delay)
            return safe_search_apps(query, n_hits, retry_count + 1)
        else:
            print(f"Failed to search Play Store for '{query}' after retries: {e}")
            return []


def safe_fetch_reviews(app_id: str, count: int = 50, retry_count: int = 0) -> list:
    try:
        from google_play_scraper import reviews, Sort
        result, _ = reviews(app_id, lang='en', country='us', count=count, sort=Sort.NEWEST)
        return result if result else []
    except Exception as e:
        if retry_count < 2:
            delay = min(2 ** retry_count, 10)
            time.sleep(delay)
            return safe_fetch_reviews(app_id, count, retry_count + 1)
        else:
            print(f"Failed to fetch reviews for app {app_id} after retries: {e}")
            return []


@shared_task(name='tasks.google_play_scraper.scrape_google_play_for_campaign')
def scrape_google_play_for_campaign(campaign_id: int):
    """Celery task: scrapes Google Play for competitor apps and reviews."""
    db = SessionLocal()
    try:
        campaign = crud.get_campaign(db, campaign_id)
        if not campaign:
            return f"Campaign {campaign_id} not found"

        keyword_objs = crud.get_keywords_by_campaign(db, campaign_id)
        keywords = [k.keyword.strip() for k in keyword_objs if k.keyword and k.keyword.strip()]
        if not keywords:
            return f"No keywords for campaign {campaign_id}"

        keyword_lookup = {k.keyword.strip().lower(): k.keyword_id for k in keyword_objs if k.keyword}

        inserted_gp_rows = 0
        inserted_scraped_rows = 0
        per_keyword_reviews: dict[int, int] = {}
        per_keyword_engagement: dict[int, int] = {}

        for keyword in keywords:
            try:
                apps = safe_search_apps(query=keyword, n_hits=5)
                if not apps:
                    continue

                for app in apps:
                    try:
                        app_id = app.get("appId", "")
                        if not app_id:
                            continue

                        app_name = app.get("title", "")
                        app_url = app.get("url", "")
                        developer = app.get("developer", "")
                        app_rating = app.get("score", 0)
                        app_reviews = safe_fetch_reviews(app_id=app_id, count=50)
                        if not app_reviews:
                            continue

                        for review in app_reviews:
                            try:
                                review_id = review.get("reviewId", "")
                                if not review_id:
                                    continue

                                exists = db.query(models.GooglePlayData).filter(
                                    models.GooglePlayData.campaign_id == campaign_id,
                                    models.GooglePlayData.review_id == review_id
                                ).first()
                                if exists:
                                    continue

                                review_content = review.get("content", "")
                                review_rating = review.get("score", 3)
                                reviewer_name = review.get("userName", "")
                                thumbs_up = review.get("thumbsUpCount", 0) or 0
                                engagement_score = max(thumbs_up, 0) + max(0, (5 - review_rating))

                                matched_keyword_id = keyword_lookup.get(keyword.lower())

                                gp_data = models.GooglePlayData(
                                    campaign_id=campaign_id,
                                    keyword_id=matched_keyword_id,
                                    app_id=app_id,
                                    app_name=app_name,
                                    app_url=app_url,
                                    developer=developer,
                                    app_rating=app_rating,
                                    review_id=review_id,
                                    review_content=review_content,
                                    review_rating=review_rating,
                                    reviewer_name=reviewer_name,
                                    thumbs_up=thumbs_up,
                                    engagement_score=engagement_score,
                                )
                                created_gp = crud.create_google_play_data(db, gp_data)
                                if created_gp:
                                    inserted_gp_rows += 1

                                campaign_scoped_post_id = f"gp_{campaign_id}_{review_id}"
                                content = f"App: {app_name}\nDeveloper: {developer}\nReview: {review_content}\nRating: {review_rating}/5"
                                scraped_data = models.ScrapedData(
                                    campaign_id=campaign_id,
                                    keyword_id=matched_keyword_id,
                                    platform=models.Platform.GOOGLE_PLAY,
                                    post_id=campaign_scoped_post_id,
                                    post_url=app_url,
                                    content=content[:2000],
                                    author=reviewer_name,
                                    engagement_score=engagement_score,
                                )
                                created_scraped = crud.create_scraped_data(db, scraped_data)
                                if created_scraped:
                                    inserted_scraped_rows += 1
                                    if matched_keyword_id:
                                        per_keyword_reviews[matched_keyword_id] = per_keyword_reviews.get(matched_keyword_id, 0) + 1
                                        per_keyword_engagement[matched_keyword_id] = per_keyword_engagement.get(matched_keyword_id, 0) + engagement_score

                            except Exception as e:
                                print(f"Error processing review: {e}")
                                continue

                        time.sleep(1.0)

                    except Exception as e:
                        print(f"Error processing app {app.get('appId', 'unknown')}: {e}")
                        continue

            except Exception as e:
                print(f"Error scraping Google Play for keyword '{keyword}': {e}")
                continue

        for keyword_id, review_count in per_keyword_reviews.items():
            engagement = per_keyword_engagement.get(keyword_id, 0)
            crud.update_keyword_activity(
                db=db,
                keyword_id=keyword_id,
                platform=models.Platform.GOOGLE_PLAY,
                post_count=review_count,
                engagement_count=engagement,
            )

        return f"Google Play scraping completed for campaign {campaign_id}. gp_data: {inserted_gp_rows}, scraped_data: {inserted_scraped_rows}"

    except Exception as e:
        print(f"Google Play scraping error for campaign {campaign_id}: {e}")
        db.rollback()
        return f"Google Play scraping failed for campaign {campaign_id}"
    finally:
        db.close()
