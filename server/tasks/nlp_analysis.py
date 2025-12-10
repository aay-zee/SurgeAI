from app.database import SessionLocal
from app import crud, schemas
from tasks.celery_worker import celery_app

# Load the Hugging Face sentiment pipeline once at import time
from transformers import pipeline
import torch

# Global variable for lazy loading
_sentiment_pipeline = None

def get_sentiment_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        # Initialize only when needed (in the worker process)
        print("Initializing Hugging Face sentiment pipeline...")
        _sentiment_pipeline = pipeline("sentiment-analysis", device=0 if torch.cuda.is_available() else -1)
    return _sentiment_pipeline


def _map_label(label: str | None) -> str:
    label = (label or "").lower()
    if "positive" in label:
        return "positive"
    if "negative" in label:
        return "negative"
    return "neutral"


def _map_score_to_range(label: str, score: float) -> float:
    # Map model score in [0,1] to [-1,1]
    # For positive: 2*score - 1; for negative: -(2*score - 1); neutral -> 0.0
    base = max(0.0, min(1.0, float(score)))
    if label.lower() == "positive":
        return base * 2.0 - 1.0
    if label.lower() == "negative":
        return -(base * 2.0 - 1.0)
    return 0.0


@celery_app.task(name="tasks.nlp_analysis.run_sentiment_for_campaign")
def run_sentiment_for_campaign(campaign_id: int):
    """
    Celery task: run baseline sentiment analysis for un-analysed
    scraped posts in the given campaign.
    """
    db = SessionLocal()
    try:
        # Fetch un-analysed scraped data rows
        rows = crud.get_unanalysed_scraped_data_for_campaign(db, campaign_id=campaign_id, limit=1000)
        if not rows:
            return f"No unanalysed posts found for campaign {campaign_id}"

        texts = [r.content or "" for r in rows]
        
        # Get the pipeline (lazy load)
        pipe = get_sentiment_pipeline()
        results = pipe(texts, truncation=True, max_length=512)

        for r, res in zip(rows, results):
            label = _map_label(res.get("label"))
            score = _map_score_to_range(label, res.get("score", 0.0))

            analysis_in = schemas.NLPAnalysisCreate(
                data_id=r.data_id, # CHANGED from r.id to r.data_id
                sentiment_score=score,
                sentiment_label=label,
                topics=None,
                keywords_extracted=None,
                intent=None,
            )
            crud.create_nlp_analysis(db, analysis_in)

        return f"Sentiment analysis completed for campaign {campaign_id}: {len(rows)} posts"
    except Exception as e:
        # Log the error; Celery will record task failure
        print(f"Sentiment task error for campaign {campaign_id}: {e}")
        raise
    finally:
        db.close()
