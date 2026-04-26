from app.database import SessionLocal
from app import models, crud
from tasks.celery_worker import celery_app


def _label_value(label) -> str:
    """Safely extract string value from a SentimentLabel enum or plain string."""
    return label.value if hasattr(label, "value") else str(label)


@celery_app.task(name="tasks.validation_engine.compute_validation_score")
def compute_validation_score(campaign_id: int):
    """
    Celery task: aggregate all NLP analysis results for a campaign and
    produce a ValidationResult row.

    Demand Score formula (0–100):
        60% — positive sentiment ratio  (how positive is the discussion?)
        40% — discussion volume score   (how much are people talking about it?)
                                        capped at 50 posts = full volume score

    Intent breakdown is included in the summary when available.
    """
    db = SessionLocal()
    try:
        # Fetch all NLP rows for this campaign (via join on scraped_data)
        rows = (
            db.query(models.NLPAnalysis)
            .join(
                models.ScrapedData,
                models.ScrapedData.data_id == models.NLPAnalysis.data_id,
            )
            .filter(models.ScrapedData.campaign_id == campaign_id)
            .all()
        )

        if not rows:
            print(f"[ValidationEngine] No NLP data for campaign {campaign_id}. Marking completed with no data.")
            crud.update_campaign_status(db, campaign_id, models.CampaignStatus.COMPLETED)
            return f"No NLP data found for campaign {campaign_id}"

        total = len(rows)
        pos = sum(1 for r in rows if _label_value(r.sentiment_label) == "positive")
        neg = sum(1 for r in rows if _label_value(r.sentiment_label) == "negative")
        neu = total - pos - neg

        # Average sentiment score across all posts (-1 to 1)
        sentiment_aggregate = sum(r.sentiment_score or 0.0 for r in rows) / total

        # Demand score
        # A post is a demand signal if it shows positive sentiment OR an active
        # need intent (pain point, buying intent, feature request).
        # Pain points ARE demand — someone complaining "I can't find a tool for X"
        # wants exactly that tool. Using sentiment alone penalises the most valuable
        # posts and produces artificially low scores.
        DEMAND_INTENTS = {"buying intent", "pain point", "feature request"}
        demand_signals = sum(
            1 for r in rows
            if _label_value(r.sentiment_label) == "positive"
            or (r.intent and r.intent.lower() in DEMAND_INTENTS)
        )
        demand_pct = (demand_signals / total) * 100
        volume_score = (min(total, 50) / 50) * 100
        demand_score = round((demand_pct * 0.6) + (volume_score * 0.4), 1)

        # Intent breakdown (only from rows that have intent populated)
        intent_rows = [r for r in rows if r.intent]
        intent_breakdown = {}
        if intent_rows:
            for r in intent_rows:
                intent_breakdown[r.intent] = intent_breakdown.get(r.intent, 0) + 1
            top_intent = max(intent_breakdown, key=intent_breakdown.get)
            top_intent_pct = round(intent_breakdown[top_intent] / len(intent_rows) * 100)
            intent_summary = f"Top user intent: '{top_intent}' ({top_intent_pct}% of posts)."
        else:
            intent_summary = ""

        # Human-readable verdict
        if demand_score >= 70:
            verdict = "Strong demand signal"
            advice = "Real interest exists. Consider building an MVP."
        elif demand_score >= 40:
            verdict = "Moderate demand signal"
            advice = "Some interest detected. Gather more data before committing."
        else:
            verdict = "Weak demand signal"
            advice = "Limited interest found. Consider refining or pivoting the idea."

        summary = (
            f"{total} posts analyzed. "
            f"{pos} positive, {neg} negative, {neu} neutral. "
            f"{verdict} — {advice}"
        )
        if intent_summary:
            summary += f" {intent_summary}"

        # Persist — always insert a new row; the endpoint fetches the latest
        result = models.ValidationResult(
            campaign_id=campaign_id,
            demand_score=demand_score,
            sentiment_aggregate=round(sentiment_aggregate, 4),
            positive_mentions=pos,
            negative_mentions=neg,
            neutral_mentions=neu,
            summary=summary,
        )
        db.add(result)
        db.commit()

        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.COMPLETED)
        print(f"[ValidationEngine] Campaign {campaign_id}: demand_score={demand_score}")
        return f"Validation complete for campaign {campaign_id}: demand_score={demand_score}"

    except Exception as e:
        print(f"[ValidationEngine] Error for campaign {campaign_id}: {e}")
        crud.update_campaign_status(db, campaign_id, models.CampaignStatus.FAILED)
        raise
    finally:
        db.close()
