import os
import time
import requests

from app.database import SessionLocal
from app import crud, schemas
from tasks.celery_worker import celery_app

# ──────────────────────────────────────────────────────────────────────────────
# HuggingFace Router configuration — set these in server/.env
#
#   HF_API_TOKEN=hf_...    (your HuggingFace token)
#
# Uses the new HuggingFace Router (router.huggingface.co) with
# OpenAI-compatible /v1/chat/completions endpoint.
# Model: meta-llama/Meta-Llama-3-8B-Instruct (free tier, confirmed working)
# ──────────────────────────────────────────────────────────────────────────────
HF_API_TOKEN: str = os.getenv("HF_API_TOKEN", "")

_HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions"
_MODEL = "meta-llama/Meta-Llama-3-8B-Instruct"

_SYSTEM_PROMPT = (
    "You are a sentiment classifier. "
    "Classify the sentiment of user-provided text as exactly one of: "
    "positive, negative, or neutral. "
    "Reply with only one word, no punctuation."
)


def _call_llm(text: str) -> dict:
    """
    Call HuggingFace Router (OpenAI-compatible) for sentiment classification.
    Uses Llama-3-8B-Instruct — free tier, no Space required.
    Returns {"label": "positive"|"negative"|"neutral", "score": float}
    """
    if not HF_API_TOKEN:
        raise ValueError("HF_API_TOKEN is not set in server/.env")

    headers = {
        "Authorization": f"Bearer {HF_API_TOKEN}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": _MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": f"Text: {text[:400]}\nSentiment:"},
        ],
        "max_tokens": 10,
        "temperature": 0.01,
    }

    response = requests.post(_HF_ROUTER_URL, headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    data = response.json()

    generated = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
        .lower()
    )

    first_word = generated.split()[0].strip(".,!?\"'") if generated else "neutral"

    if "positive" in first_word:
        return {"label": "positive", "score": 0.9}
    if "negative" in first_word:
        return {"label": "negative", "score": 0.9}
    return {"label": "neutral", "score": 0.8}


def _map_label(label: str | None) -> str:
    label = (label or "").lower()
    if "positive" in label:
        return "positive"
    if "negative" in label:
        return "negative"
    return "neutral"


def _map_score_to_range(label: str, score: float) -> float:
    """Map confidence score [0,1] to sentiment range [-1,1]."""
    base = max(0.0, min(1.0, float(score)))
    if label == "positive":
        return base * 2.0 - 1.0
    if label == "negative":
        return -(base * 2.0 - 1.0)
    return 0.0


@celery_app.task(name="tasks.nlp_analysis.run_sentiment_for_campaign")
def run_sentiment_for_campaign(campaign_id: int):
    """
    Celery task: run sentiment analysis for un-analysed scraped posts
    using Llama-3-8B-Instruct via HuggingFace Router (free tier).
    Configure HF_API_TOKEN in server/.env before running.
    """
    db = SessionLocal()
    try:
        rows = crud.get_unanalysed_scraped_data_for_campaign(
            db, campaign_id=campaign_id, limit=1000
        )
        if not rows:
            return f"No unanalysed posts found for campaign {campaign_id}"

        processed = 0
        errors = 0

        for r in rows:
            try:
                text = (r.content or "").strip()
                if not text:
                    label, score_raw = "neutral", 0.5
                else:
                    res = _call_llm(text)
                    label = _map_label(res.get("label"))
                    score_raw = res.get("score", 0.5)

                score = _map_score_to_range(label, score_raw)

                analysis_in = schemas.NLPAnalysisCreate(
                    data_id=r.data_id,
                    sentiment_score=score,
                    sentiment_label=label,
                    topics=None,
                    keywords_extracted=None,
                    intent=None,
                )
                crud.create_nlp_analysis(db, analysis_in)
                processed += 1

                # Respect HF free-tier rate limits (~1 req/sec)
                time.sleep(1.0)

            except Exception as e:
                errors += 1
                print(f"Error analysing post {r.data_id} for campaign {campaign_id}: {e}")
                continue

        return (
            f"Sentiment analysis completed for campaign {campaign_id}: "
            f"{processed} processed, {errors} errors"
        )
    except Exception as e:
        print(f"Sentiment task error for campaign {campaign_id}: {e}")
        raise
    finally:
        db.close()
