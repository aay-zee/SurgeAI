"""
Relevance Filter — uses embeddings to filter out noise from scraped data.
Compares each post's content against the campaign's problem statement.
"""

from sqlalchemy.orm import Session
from . import models
from .embedding_service import embed_single, embed_texts, cosine_similarity


def filter_relevant_data(
    campaign_id: int,
    db: Session,
    threshold: float = 0.25,
) -> dict:
    """
    Embed the campaign problem statement and all scraped data.
    Mark each post with relevance_score and is_relevant flag.
    Returns stats: {total, relevant, filtered_out, avg_score}.
    """
    campaign = db.query(models.Campaign).filter(
        models.Campaign.campaign_id == campaign_id
    ).first()
    if not campaign:
        raise ValueError(f"Campaign {campaign_id} not found")

    # Build problem context from name + description + keywords
    parts = [campaign.campaign_name or ""]
    if campaign.description:
        parts.append(campaign.description)
    if campaign.keywords_text:
        parts.append(campaign.keywords_text)
    problem_text = " ".join(parts).strip()

    if not problem_text:
        return {"total": 0, "relevant": 0, "filtered_out": 0, "avg_score": 0}

    # Embed problem statement
    problem_emb = embed_single(problem_text)
    campaign.problem_embedding = problem_emb
    db.commit()

    # Get all scraped data for this campaign
    scraped = db.query(models.ScrapedData).filter(
        models.ScrapedData.campaign_id == campaign_id
    ).all()

    if not scraped:
        return {"total": 0, "relevant": 0, "filtered_out": 0, "avg_score": 0}

    # Batch-embed all content
    contents = []
    for item in scraped:
        text = (item.content or "").strip()
        contents.append(text if text else "empty")

    embeddings = embed_texts(contents)

    # Score each post
    total = len(scraped)
    relevant = 0
    scores = []

    for item, emb in zip(scraped, embeddings):
        score = cosine_similarity(problem_emb, emb)
        item.embedding = emb
        item.relevance_score = round(score, 4)
        item.is_relevant = score >= threshold
        scores.append(score)
        if item.is_relevant:
            relevant += 1

    db.commit()

    avg_score = sum(scores) / len(scores) if scores else 0

    stats = {
        "total": total,
        "relevant": relevant,
        "filtered_out": total - relevant,
        "avg_score": round(avg_score, 4),
        "threshold": threshold,
    }

    print(f"[Relevance] Campaign {campaign_id}: {relevant}/{total} posts relevant (avg={avg_score:.3f})")
    return stats
