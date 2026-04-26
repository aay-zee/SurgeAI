from celery import shared_task
from app.database import SessionLocal


@shared_task(name="tasks.relevance_filter_task.run_relevance_filter")
def run_relevance_filter(campaign_id: int):
    """
    Celery task: compute semantic similarity between each scraped post
    and the campaign's problem statement, then mark each post with
    is_relevant=True/False using the all-MiniLM-L6-v2 embedding model.

    Posts default to is_relevant=True, so if this task fails the NLP
    step still runs on all posts — this failure is intentionally non-fatal.
    """
    db = SessionLocal()
    try:
        from app.relevance_filter import filter_relevant_data
        stats = filter_relevant_data(campaign_id=campaign_id, db=db)
        return (
            f"Relevance filtering done for campaign {campaign_id}: "
            f"{stats['relevant']}/{stats['total']} posts relevant "
            f"(avg_score={stats['avg_score']}, threshold={stats['threshold']})"
        )
    except Exception as e:
        print(f"[RelevanceFilter] Failed for campaign {campaign_id}: {e}. NLP will run on all posts.")
        return f"Relevance filtering failed (non-fatal) for campaign {campaign_id}: {e}"
    finally:
        db.close()
