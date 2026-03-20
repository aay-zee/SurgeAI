"""
Celery task for running the semantic validation pipeline asynchronously.
"""

from app.database import SessionLocal
from tasks.celery_worker import celery_app


@celery_app.task(name="tasks.semantic_analysis.run_semantic_pipeline")
def run_semantic_pipeline(campaign_id: int):
    """
    Celery task: run the full semantic validation pipeline.
    Wraps app.pipeline.run_validation_pipeline for async execution.
    """
    db = SessionLocal()
    try:
        from app.pipeline import run_validation_pipeline
        result = run_validation_pipeline(campaign_id, db)
        return {
            "status": result.get("status", "completed"),
            "campaign_id": campaign_id,
            "steps": {
                k: ("success" if "error" not in v else v["error"])
                for k, v in result.get("steps", {}).items()
                if isinstance(v, dict)
            },
        }
    except Exception as e:
        print(f"[Semantic Pipeline] Task error for campaign {campaign_id}: {e}")
        raise
    finally:
        db.close()
