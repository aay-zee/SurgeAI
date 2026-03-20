import requests
import time
import os
from dotenv import load_dotenv
from celery import shared_task
from app.database import SessionLocal
from app import models, crud

load_dotenv()

STACK_EXCHANGE_BASE = "https://api.stackexchange.com/2.3"
STACK_EXCHANGE_API_KEY = os.getenv("STACK_EXCHANGE_API_KEY", "")


def safe_search_questions(query: str, site: str = "stackoverflow", page_size: int = 25, retry_count: int = 0) -> list:
    """
    Perform a safe Stack Exchange search with retry & rate-limit handling.
    Returns a list of question data dicts.
    """
    headers = {
        "Accept-Encoding": "gzip, deflate"
    }

    params = {
        "q": query,
        "site": site,
        "sort": "votes",
        "order": "desc",
        "pagesize": min(page_size, 100),
        "filter": "withbody"
    }

    if STACK_EXCHANGE_API_KEY:
        params["key"] = STACK_EXCHANGE_API_KEY

    try:
        response = requests.get(
            f"{STACK_EXCHANGE_BASE}/search/advanced",
            headers=headers,
            params=params,
            timeout=15
        )

        if response.status_code == 429:
            # SE returns backoff_on_authentication in response body
            try:
                data = response.json()
                backoff = data.get("backoff", 5)
            except:
                backoff = min(2 ** retry_count, 30)

            print(f"Rate limit hit on {site}. Waiting {backoff} seconds...")
            time.sleep(backoff)
            if retry_count < 3:
                return safe_search_questions(query, site, page_size, retry_count + 1)
            else:
                print(f"Max retries reached for query: {query} on {site}")
                return []

        if response.status_code != 200:
            print(f"Error searching Stack Exchange for '{query}' on {site}: {response.status_code}")
            return []

        data = response.json()
        return data.get("items", [])

    except requests.Timeout:
        print(f"Timeout searching Stack Exchange for '{query}' on {site}")
        return []
    except Exception as e:
        print(f"Unexpected error searching Stack Exchange for '{query}' on {site}: {e}")
        return []


def safe_fetch_answers(question_ids: list, site: str = "stackoverflow", retry_count: int = 0) -> dict:
    """
    Fetch accepted answers for multiple questions.
    Returns dict: {question_id: answer_body}
    """
    if not question_ids:
        return {}

    headers = {
        "Accept-Encoding": "gzip, deflate"
    }

    # SE API limits to 30 IDs per request
    ids_str = ";".join(str(q_id) for q_id in question_ids[:30])

    params = {
        "site": site,
        "filter": "withbody",
        "sort": "votes",
        "order": "desc"
    }

    if STACK_EXCHANGE_API_KEY:
        params["key"] = STACK_EXCHANGE_API_KEY

    try:
        response = requests.get(
            f"{STACK_EXCHANGE_BASE}/questions/{ids_str}/answers",
            headers=headers,
            params=params,
            timeout=15
        )

        if response.status_code == 429:
            backoff = min(2 ** retry_count, 20)
            print(f"Rate limit on answers fetch. Waiting {backoff}s...")
            time.sleep(backoff)
            if retry_count < 2:
                return safe_fetch_answers(question_ids, site, retry_count + 1)
            return {}

        if response.status_code != 200:
            print(f"Error fetching answers for {site}: {response.status_code}")
            return {}

        data = response.json()
        answers_map = {}
        for answer in data.get("items", []):
            q_id = answer.get("question_id")
            if q_id and answer.get("is_accepted"):
                answers_map[q_id] = answer.get("body", "")

        return answers_map

    except Exception as e:
        print(f"Error fetching answers from {site}: {e}")
        return {}


@shared_task(name='tasks.stackexchange_scraper.scrape_stackexchange_for_campaign')
def scrape_stackexchange_for_campaign(campaign_id: int):
    """
    Celery task: scrapes Stack Exchange for Q&A matching campaign keywords.
    Writes to both StackExchangeData (source-specific) and ScrapedData (NLP).
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

        keyword_lookup = {k.keyword.strip().lower(): k.keyword_id for k in keyword_objs if k.keyword}

        inserted_se_rows = 0
        inserted_scraped_rows = 0
        per_keyword_questions = {}
        per_keyword_engagement = {}

        sites = ["stackoverflow", "softwareengineering"]

        for keyword in keywords:
            for site in sites:
                try:
                    questions = safe_search_questions(query=keyword, site=site, page_size=25)
                    if not questions:
                        continue

                    # Batch-fetch accepted answers for all questions
                    question_ids = [q.get("question_id") for q in questions if q.get("question_id")]
                    answers_map = safe_fetch_answers(question_ids, site) if question_ids else {}

                    for question in questions:
                        try:
                            q_id = question.get("question_id")
                            if not q_id:
                                continue

                            # Duplicate check
                            exists = db.query(models.StackExchangeData).filter(
                                models.StackExchangeData.campaign_id == campaign_id,
                                models.StackExchangeData.source_question_id == str(q_id),
                                models.StackExchangeData.site == site
                            ).first()
                            if exists:
                                continue

                            q_title = question.get("title", "")
                            q_body = question.get("body", "")
                            q_url = question.get("link", "")
                            tags = ",".join(question.get("tags", []))
                            votes = question.get("score", 0) or 0
                            answer_count = question.get("answer_count", 0) or 0
                            view_count = question.get("view_count", 0) or 0
                            is_answered = question.get("is_answered", False)
                            accepted_answer = answers_map.get(q_id, "")

                            # Engagement: votes + answers + is_answered bonus
                            engagement_score = max(votes, 0) + max(answer_count, 0) + (1 if is_answered else 0)

                            matched_keyword_id = keyword_lookup.get(keyword.lower())

                            # Write to StackExchangeData table
                            se_data = models.StackExchangeData(
                                campaign_id=campaign_id,
                                keyword_id=matched_keyword_id,
                                source_question_id=str(q_id),
                                site=site,
                                question_url=q_url,
                                question_title=q_title,
                                question_body=q_body[:2000] if q_body else None,
                                accepted_answer=accepted_answer[:2000] if accepted_answer else None,
                                tags=tags,
                                votes=votes,
                                answer_count=answer_count,
                                view_count=view_count,
                                is_answered=is_answered,
                                engagement_score=engagement_score,
                            )
                            created_se = crud.create_stack_exchange_data(db, se_data)
                            if created_se:
                                inserted_se_rows += 1

                            # Write to ScrapedData table (for NLP)
                            campaign_scoped_post_id = f"se_{campaign_id}_{q_id}_{site}"
                            content = f"Question: {q_title}\nDetails: {q_body}\nAccepted Answer: {accepted_answer}\nTags: {tags}"
                            scraped_data = models.ScrapedData(
                                campaign_id=campaign_id,
                                keyword_id=matched_keyword_id,
                                platform=models.Platform.STACK_EXCHANGE,
                                post_id=campaign_scoped_post_id,
                                post_url=q_url,
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

                    time.sleep(1.0)  # rate-limit courtesy delay between sites

                except Exception as e:
                    print(f"Error scraping Stack Exchange {site} for keyword '{keyword}': {e}")
                    continue

        # Update KeywordActivity stats
        for keyword_id, question_count in per_keyword_questions.items():
            engagement = per_keyword_engagement.get(keyword_id, 0)
            crud.update_keyword_activity(
                db=db,
                keyword_id=keyword_id,
                platform=models.Platform.STACK_EXCHANGE,
                post_count=question_count,
                engagement_count=engagement,
            )

        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.COMPLETED)
        return f"Stack Exchange scraping completed for campaign {campaign_id}"

    except Exception as e:
        print(f"Stack Exchange scraping error for campaign {campaign_id}: {e}")
        db.rollback()
        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.FAILED)
        return f"Stack Exchange scraping failed for campaign {campaign_id}"
    finally:
        db.close()
