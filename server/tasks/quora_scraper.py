import requests
import time
import os
import re
from dotenv import load_dotenv
from celery import shared_task
from app.database import SessionLocal
from app import models, crud

load_dotenv()

SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")
SERPAPI_BASE = "https://serpapi.com/search"


def safe_fetch_quora_search(query: str, api_key: str = "", limit: int = 20, retry_count: int = 0) -> list:
    """
    Find Quora questions for a keyword using SerpAPI Google Search (site:quora.com).
    Returns a list of question data dicts.
    """
    if not api_key:
        print(f"Warning: No SERPAPI_KEY set. Cannot fetch Quora data for '{query}'")
        return []

    params = {
        "engine": "google",
        "q": f"site:quora.com {query}",
        "api_key": api_key,
        "num": min(limit, 20),
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
                return safe_fetch_quora_search(query, api_key, limit, retry_count + 1)
            else:
                print(f"Max retries reached for query: {query}")
                return []

        if response.status_code == 402:
            print("SerpAPI quota exceeded.")
            return []

        if response.status_code != 200:
            print(f"Error fetching Quora questions for '{query}': {response.status_code}")
            return []

        data = response.json()

        if "error" in data:
            print(f"SerpAPI error for '{query}': {data['error']}")
            return []

        organic_results = data.get("organic_results", [])
        if not organic_results:
            print(f"No Quora results found for '{query}'")
            return []

        questions = []
        for result in organic_results:
            try:
                link = result.get("link", "")
                title = result.get("title", "")
                snippet = result.get("snippet", "")

                # Only include actual Quora question pages
                if "quora.com" not in link:
                    continue

                # Extract a stable question ID from the URL
                # Quora URLs look like: https://www.quora.com/What-is-the-best-way-to-learn
                url_path = link.rstrip("/").split("/")[-1] if "/" in link else ""
                question_id = url_path if url_path else f"q_{len(questions)}"

                # Clean up title (Quora titles often end with " - Quora")
                clean_title = re.sub(r'\s*[-–]\s*Quora\s*$', '', title).strip()
                if not clean_title:
                    clean_title = title

                questions.append({
                    "question_id": question_id,
                    "question_url": link,
                    "question_title": clean_title,
                    "description": snippet,
                    "upvotes": 0,
                    "answer_count": 0,
                })
            except Exception as e:
                print(f"Error parsing Quora result: {e}")
                continue

        return questions

    except requests.Timeout:
        print(f"Timeout fetching Quora questions for '{query}'")
        return []
    except Exception as e:
        print(f"Unexpected error fetching Quora questions for '{query}': {e}")
        return []


@shared_task(name='tasks.quora_scraper.scrape_quora_for_campaign')
def scrape_quora_for_campaign(campaign_id: int):
    """
    Celery task: finds Quora questions for a campaign's keywords via SerpAPI.
    Writes to both QuoraData (source-specific) and ScrapedData (NLP).
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
            print(f"Warning: SERPAPI_KEY not set. Skipping Quora scraping for campaign {campaign_id}")
            crud.update_campaign_status(db, campaign_id, models.CampaignStatus.COMPLETED)
            return f"Skipped: No SERPAPI_KEY configured"

        keyword_lookup = {k.keyword.strip().lower(): k.keyword_id for k in keyword_objs if k.keyword}

        inserted_quora_rows = 0
        inserted_scraped_rows = 0
        per_keyword_questions = {}
        per_keyword_engagement = {}

        for keyword in keywords:
            try:
                questions = safe_fetch_quora_search(query=keyword, api_key=SERPAPI_KEY, limit=20)
                if not questions:
                    continue

                for question in questions:
                    try:
                        question_id = question.get("question_id", "")
                        if not question_id:
                            continue

                        # Duplicate check
                        exists = db.query(models.QuoraData).filter(
                            models.QuoraData.campaign_id == campaign_id,
                            models.QuoraData.source_post_id == question_id
                        ).first()
                        if exists:
                            continue

                        question_title = question.get("question_title", "")
                        question_url = question.get("question_url", "")
                        description = question.get("description", "")
                        upvotes = question.get("upvotes", 0) or 0
                        answer_count = question.get("answer_count", 0) or 0
                        engagement_score = max(upvotes, 0) + max(answer_count, 0) + 1

                        matched_keyword_id = keyword_lookup.get(keyword.lower())

                        # Write to QuoraData table
                        quora_data = models.QuoraData(
                            campaign_id=campaign_id,
                            keyword_id=matched_keyword_id,
                            source_post_id=question_id,
                            question_url=question_url,
                            question_title=question_title,
                            description=description,
                            top_answer=None,
                            author=None,
                            upvotes=upvotes,
                            answer_count=answer_count,
                            engagement_score=engagement_score,
                        )
                        created_quora = crud.create_quora_data(db, quora_data)
                        if created_quora:
                            inserted_quora_rows += 1

                        # Write to ScrapedData table (for NLP)
                        campaign_scoped_post_id = f"quora_{campaign_id}_{question_id}"
                        content = f"Question: {question_title}\nDescription: {description}\nAnswers: {answer_count}"
                        scraped_data = models.ScrapedData(
                            campaign_id=campaign_id,
                            keyword_id=matched_keyword_id,
                            platform=models.Platform.QUORA,
                            post_id=campaign_scoped_post_id,
                            post_url=question_url,
                            content=content[:2000],
                            author=None,
                            engagement_score=engagement_score,
                        )
                        created_scraped = crud.create_scraped_data(db, scraped_data)
                        if created_scraped:
                            inserted_scraped_rows += 1
                            if matched_keyword_id:
                                per_keyword_questions[matched_keyword_id] = per_keyword_questions.get(matched_keyword_id, 0) + 1
                                per_keyword_engagement[matched_keyword_id] = per_keyword_engagement.get(matched_keyword_id, 0) + engagement_score

                    except Exception as e:
                        print(f"Error processing question {question.get('question_id', 'unknown')}: {e}")
                        continue

                time.sleep(2.0)  # rate-limit between keyword searches

            except Exception as e:
                print(f"Error scraping Quora for keyword '{keyword}': {e}")
                continue

        # Update KeywordActivity stats
        for keyword_id, question_count in per_keyword_questions.items():
            engagement = per_keyword_engagement.get(keyword_id, 0)
            crud.update_keyword_activity(
                db=db,
                keyword_id=keyword_id,
                platform=models.Platform.QUORA,
                post_count=question_count,
                engagement_count=engagement,
            )

        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.COMPLETED)
        return f"Quora scraping completed for campaign {campaign_id}: {inserted_quora_rows} questions, {inserted_scraped_rows} scraped rows"

    except Exception as e:
        print(f"Quora scraping error for campaign {campaign_id}: {e}")
        db.rollback()
        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.FAILED)
        return f"Quora scraping failed for campaign {campaign_id}"
    finally:
        db.close()
