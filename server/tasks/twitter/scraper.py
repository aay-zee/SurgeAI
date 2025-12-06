from __future__ import annotations

from typing import Dict, Iterable, List

from celery import shared_task
from tweepy import TweepyException

from app.database import SessionLocal
from app import crud, models
from .client import MissingTwitterCredentials, get_twitter_client


def _build_query(keywords: Iterable[str]) -> str:
    terms = [term.strip() for term in keywords if term and term.strip()]
    if not terms:
        raise ValueError("No keywords provided for Twitter search")

    # Use OR to broaden matching, filter out retweets and replies, and keep English tweets.
    joined = " OR ".join([f'"{term}"' for term in terms])
    return f"({joined}) lang:en -is:retweet -is:reply"


def _index_users(users: List) -> Dict[str, str]:
    """Map user id to username for quick lookup."""
    mapping: Dict[str, str] = {}
    if not users:
        return mapping

    for user in users:
        if getattr(user, "id", None):
            mapping[str(user.id)] = getattr(user, "username", None) or getattr(user, "name", None) or ""
    return mapping


@shared_task(name="tasks.twitter.scrape_twitter_for_campaign")
def scrape_twitter_for_campaign(campaign_id: int):
    """Celery task to fetch recent tweets for a campaign's keywords."""
    db = SessionLocal()
    try:
        campaign = crud.get_campaign(db, campaign_id)
        if not campaign:
            print(f"Campaign {campaign_id} not found.")
            return

        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.SCRAPING)
        keywords = campaign.keywords.split(",")

        query = _build_query(keywords)
        try:
            client = get_twitter_client()
        except MissingTwitterCredentials as cred_error:
            print(f"Twitter credentials error: {cred_error}")
            crud.update_campaign_status(db, campaign_id, models.CampaignStatus.FAILED)
            return

        response = client.search_recent_tweets(
            query=query,
            tweet_fields=["id", "text", "author_id", "lang", "created_at"],
            expansions=["author_id"],
            user_fields=["username", "name"],
            max_results=50,
        )

        user_lookup = _index_users(response.includes.get("users", []) if response and response.includes else [])
        tweets = response.data or []

        for tweet in tweets:
            # Skip non-English tweets even though query filters; keeps behavior defensive.
            if getattr(tweet, "lang", None) and tweet.lang != "en":
                continue

            author_username = user_lookup.get(str(getattr(tweet, "author_id", "")), None)
            scraped = models.ScrapedData(
                campaign_id=campaign_id,
                platform=models.Platform.TWITTER,
                post_id=str(tweet.id),
                post_url=f"https://twitter.com/i/web/status/{tweet.id}",
                content=getattr(tweet, "text", ""),
                author=author_username,
            )
            crud.create_scraped_data(db, scraped)

        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.COMPLETED)
        print(f"Finished Twitter scraping for campaign {campaign_id}")

    except TweepyException as api_err:
        print(f"Twitter API error: {api_err}")
        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.FAILED)
    except Exception as exc:  # pragma: no cover - fallback path
        print(f"An error occurred while scraping Twitter: {exc}")
        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.FAILED)
    finally:
        db.close()

    return f"Twitter scraping completed for campaign {campaign_id}"
