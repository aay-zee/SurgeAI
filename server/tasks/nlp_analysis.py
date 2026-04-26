from app.database import SessionLocal
from app import crud, schemas
from tasks.celery_worker import celery_app

from transformers import pipeline
import torch
from collections import Counter
import re

# ── Lazy-loaded pipelines (one instance per Celery worker process) ────────────
_sentiment_pipeline = None
_intent_pipeline = None

# Words to ignore when extracting topics
_STOPWORDS = {
    "the","a","an","and","or","but","in","on","at","to","for","of","with",
    "is","it","i","my","this","that","was","be","are","have","has","not",
    "he","she","they","we","you","do","did","as","by","from","its","so",
    "if","up","out","than","just","about","what","can","will","there","their",
    "been","your","all","more","also","when","which","who","me","one","would",
    "like","get","use","really","very","any","some","no","new","good","got",
    "im","ive","dont","thats","its","youre","theyre","hes","shes","weve",
    "reddit","post","comment","https","www","com","title",
}

INTENT_LABELS = [
    "buying intent",
    "pain point",
    "feature request",
    "positive feedback",
    "general discussion",
]


def get_sentiment_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        print("Loading sentiment pipeline: cardiffnlp/twitter-roberta-base-sentiment-latest")
        _sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            device=0 if torch.cuda.is_available() else -1,
        )
    return _sentiment_pipeline


def get_intent_pipeline():
    global _intent_pipeline
    if _intent_pipeline is None:
        print("Loading zero-shot intent pipeline: facebook/bart-large-mnli")
        _intent_pipeline = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli",
            device=0 if torch.cuda.is_available() else -1,
        )
    return _intent_pipeline


# ── Helpers ───────────────────────────────────────────────────────────────────

def _map_label(label: str | None) -> str:
    """
    cardiffnlp/twitter-roberta-base-sentiment-latest outputs:
        LABEL_0 = negative
        LABEL_1 = neutral
        LABEL_2 = positive
    Plain-text labels are also handled for safety.
    """
    label = (label or "").upper()
    if label in ("LABEL_2", "POSITIVE"):
        return "positive"
    if label in ("LABEL_0", "NEGATIVE"):
        return "negative"
    return "neutral"


def _map_score_to_range(label: str, score: float) -> float:
    """Map model confidence [0, 1] to sentiment score [-1, 1]. Neutral is always 0."""
    base = max(0.0, min(1.0, float(score)))
    if label == "positive":
        return round(base * 2.0 - 1.0, 4)
    if label == "negative":
        return round(-(base * 2.0 - 1.0), 4)
    return 0.0


def _extract_topics(text: str, top_n: int = 5) -> dict:
    """
    Extract the top N meaningful words from a post using word frequency.
    Filters out stopwords and short words (< 4 chars).
    Returns a dict so it can be stored in the JSON column.
    """
    words = re.findall(r'\b[a-z]{4,}\b', text.lower())
    filtered = [w for w in words if w not in _STOPWORDS]
    counts = Counter(filtered)
    return {"top_words": [w for w, _ in counts.most_common(top_n)]}


# ── Celery task ───────────────────────────────────────────────────────────────

@celery_app.task(name="tasks.nlp_analysis.run_sentiment_for_campaign")
def run_sentiment_for_campaign(campaign_id: int):
    """
    Celery task: run sentiment analysis + intent detection + topic extraction
    for all un-analysed scraped posts in the given campaign.

    Pipeline:
        1. Sentiment  — cardiffnlp/twitter-roberta-base-sentiment-latest (batch)
        2. Intent     — facebook/bart-large-mnli zero-shot classification (per post)
        3. Topics     — simple word-frequency extraction (no model, in-process)
    """
    db = SessionLocal()
    try:
        rows = crud.get_unanalysed_scraped_data_for_campaign(
            db, campaign_id=campaign_id, limit=1000
        )
        if not rows:
            return f"No unanalysed posts found for campaign {campaign_id}"

        texts = [r.content or "" for r in rows]

        # Step 1 — Sentiment (runs the whole batch in one call, fast)
        sentiment_pipe = get_sentiment_pipeline()
        sentiment_results = sentiment_pipe(texts, truncation=True, max_length=512)

        # Step 2 & 3 — Intent + Topics (per post)
        try:
            intent_pipe = get_intent_pipeline()
        except Exception as e:
            print(f"[NLP] Intent pipeline failed to load: {e}. Intent detection will be skipped.")
            intent_pipe = None

        for row, sent_res in zip(rows, sentiment_results):
            text = row.content or ""

            label = _map_label(sent_res.get("label"))
            score = _map_score_to_range(label, sent_res.get("score", 0.0))

            # Intent — truncate to 1024 chars so large posts don't time out
            detected_intent = None
            if intent_pipe is not None:
                try:
                    intent_res = intent_pipe(
                        text[:1024],
                        candidate_labels=INTENT_LABELS,
                        multi_label=False,
                    )
                    detected_intent = intent_res["labels"][0]
                except Exception as e:
                    print(f"Intent detection failed for data_id={row.data_id}: {e}")

            # Topics
            topics = _extract_topics(text)

            analysis_in = schemas.NLPAnalysisCreate(
                data_id=row.data_id,
                sentiment_score=score,
                sentiment_label=label,
                topics=topics,
                keywords_extracted=None,
                intent=detected_intent,
            )
            crud.create_nlp_analysis(db, analysis_in)

        return f"Analysis completed for campaign {campaign_id}: {len(rows)} posts"

    except Exception as e:
        print(f"NLP task error for campaign {campaign_id}: {e}")
        # Don't re-raise — let compute_validation_score still run and set COMPLETED/FAILED
        return f"NLP failed for campaign {campaign_id}: {e}"
    finally:
        db.close()
