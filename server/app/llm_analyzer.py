"""
LLM-Powered Analysis — batched sentiment, validation scoring,
theme extraction, and competitor analysis using LLM calls.
Operates on relevant posts only (is_relevant=True).
"""

import json
from sqlalchemy.orm import Session
from . import models, crud, schemas
from .llm_client import call_llm, extract_json


# ─────────────────── BATCHED SENTIMENT ───────────────────

def batch_sentiment_analysis(
    campaign_id: int,
    db: Session,
    batch_size: int = 10,
) -> dict:
    """
    Analyze sentiment in batches of 10 posts per LLM call.
    Writes results to NLPAnalysis table for backward compatibility.
    Returns: {processed, errors, batches}
    """
    posts = (
        db.query(models.ScrapedData)
        .filter(models.ScrapedData.campaign_id == campaign_id)
        .filter(models.ScrapedData.is_relevant == True)
        .all()
    )

    if not posts:
        return {"processed": 0, "errors": 0, "batches": 0}

    system_prompt = (
        "You are a sentiment analysis expert. Classify each post's sentiment. "
        "Return a JSON array where each element has: "
        '{"index": 0, "label": "positive"|"negative"|"neutral", "score": 0.0-1.0, "reason": "brief reason"}. '
        "Return ONLY the JSON array."
    )

    processed = 0
    errors = 0
    batch_count = 0

    for i in range(0, len(posts), batch_size):
        batch = posts[i : i + batch_size]
        batch_count += 1

        lines = []
        for idx, post in enumerate(batch):
            text = (post.content or "").strip()[:300]
            lines.append(f"[{idx}] {text}")

        user_prompt = "Classify the sentiment of each post:\n\n" + "\n\n".join(lines)

        try:
            response = call_llm(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=500,
                temperature=0.1,
            )

            results = extract_json(response)
            if not isinstance(results, list):
                results = []

            result_map = {}
            for r in results:
                if isinstance(r, dict) and "index" in r:
                    result_map[r["index"]] = r

            for idx, post in enumerate(batch):
                r = result_map.get(idx, {})
                label = _normalize_label(r.get("label", "neutral"))
                score_raw = float(r.get("score", 0.5))
                score = _map_score(label, score_raw)

                analysis_in = schemas.NLPAnalysisCreate(
                    data_id=post.data_id,
                    sentiment_score=score,
                    sentiment_label=label,
                    topics={"reason": r.get("reason", "")},
                    keywords_extracted=None,
                    intent=None,
                )
                try:
                    crud.create_or_update_nlp_analysis(db, analysis_in)
                    processed += 1
                except Exception:
                    errors += 1

        except Exception as e:
            print(f"[Sentiment] Batch {batch_count} failed: {e}")
            errors += len(batch)

    return {"processed": processed, "errors": errors, "batches": batch_count}


# ─────────────────── VALIDATION SCORING ───────────────────

def llm_validation_scoring(
    campaign_id: int,
    db: Session,
) -> dict:
    """
    Single LLM call to score all 8 validation dimensions with evidence.
    Writes to ValidationScore table. Returns the scores dict.
    """
    campaign = db.query(models.Campaign).filter(
        models.Campaign.campaign_id == campaign_id
    ).first()
    if not campaign:
        raise ValueError("Campaign not found")

    relevant_posts = (
        db.query(models.ScrapedData)
        .filter(models.ScrapedData.campaign_id == campaign_id)
        .filter(models.ScrapedData.is_relevant == True)
        .limit(50)
        .all()
    )

    sentiment_summary = crud.get_campaign_sentiment_summary(db, campaign_id)
    search_vols = db.query(models.SearchVolumeData).filter(
        models.SearchVolumeData.campaign_id == campaign_id
    ).all()

    posts_summary = "\n".join(
        f"- [{p.platform.value if p.platform else 'unknown'}] {(p.content or '')[:150]}"
        for p in relevant_posts[:30]
    )

    vol_info = "No search volume data."
    if search_vols:
        avg_vol = sum(sv.monthly_volume for sv in search_vols) / len(search_vols)
        cpcs = [sv.cpc for sv in search_vols if sv.cpc]
        avg_cpc = sum(cpcs) / len(cpcs) if cpcs else 0
        vol_info = f"Avg monthly search volume: {int(avg_vol):,}, Avg CPC: ${avg_cpc:.2f}"

    system_prompt = (
        "You are a startup validation expert. Score the idea on 8 dimensions (1-10 each). "
        "Return ONLY a JSON object with keys: market_size, demand, problem_clarity, "
        "competitor_gap, technical_feasibility, market_growth, pain_point_severity, "
        "monetization_potential. Each value should be {\"score\": N, \"reason\": \"...\"}"
    )

    user_prompt = f"""Startup: {campaign.campaign_name}
Description: {campaign.description or 'N/A'}
Keywords: {campaign.keywords_text or 'N/A'}

Market Data: {vol_info}
Sentiment: {sentiment_summary}

Relevant user posts (sample):
{posts_summary or 'No relevant posts found.'}

Score each dimension 1-10 with a specific reason based on the data above."""

    try:
        response = call_llm(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=1000,
            temperature=0.3,
        )
        scores = extract_json(response)
        if not isinstance(scores, dict):
            scores = {}
    except Exception as e:
        print(f"[Validation] LLM scoring failed: {e}")
        scores = {}

    dimensions = [
        "market_size", "demand", "problem_clarity", "competitor_gap",
        "technical_feasibility", "market_growth", "pain_point_severity",
        "monetization_potential",
    ]

    final_scores = {}
    for dim in dimensions:
        dim_data = scores.get(dim, {})
        if isinstance(dim_data, dict):
            s = min(10, max(1, int(dim_data.get("score", 5))))
            r = str(dim_data.get("reason", "LLM analysis"))
        else:
            s = min(10, max(1, int(dim_data))) if isinstance(dim_data, (int, float)) else 5
            r = "LLM analysis"
        final_scores[dim] = {"score": s, "reason": r}

    dim_values = [final_scores[d]["score"] for d in dimensions]
    overall = round(sum(dim_values) / len(dim_values), 1) if dim_values else 5.0
    final_scores["overall_score"] = overall

    vs = models.ValidationScore(
        campaign_id=campaign_id,
        market_size=final_scores["market_size"]["score"],
        demand=final_scores["demand"]["score"],
        problem_clarity=final_scores["problem_clarity"]["score"],
        competitor_gap=final_scores["competitor_gap"]["score"],
        technical_feasibility=final_scores["technical_feasibility"]["score"],
        market_growth=final_scores["market_growth"]["score"],
        pain_point_severity=final_scores["pain_point_severity"]["score"],
        monetization_potential=final_scores["monetization_potential"]["score"],
        market_size_reason=final_scores["market_size"]["reason"],
        demand_reason=final_scores["demand"]["reason"],
        problem_clarity_reason=final_scores["problem_clarity"]["reason"],
        competitor_gap_reason=final_scores["competitor_gap"]["reason"],
        technical_feasibility_reason=final_scores["technical_feasibility"]["reason"],
        market_growth_reason=final_scores["market_growth"]["reason"],
        pain_point_severity_reason=final_scores["pain_point_severity"]["reason"],
        monetization_potential_reason=final_scores["monetization_potential"]["reason"],
        overall_score=overall,
    )
    crud.create_or_update_validation_score(db, vs)

    return final_scores


# ─────────────────── THEME EXTRACTION ───────────────────

def extract_themes_llm(
    campaign_id: int,
    db: Session,
) -> dict:
    """
    Single LLM call on top negative/relevant posts to extract themes.
    Returns themes with quotes, frequency, severity.
    """
    campaign = db.query(models.Campaign).filter(
        models.Campaign.campaign_id == campaign_id
    ).first()
    if not campaign:
        return {}

    negative_posts = (
        db.query(models.ScrapedData)
        .join(models.NLPAnalysis, models.NLPAnalysis.data_id == models.ScrapedData.data_id)
        .filter(models.ScrapedData.campaign_id == campaign_id)
        .filter(models.ScrapedData.is_relevant == True)
        .filter(models.NLPAnalysis.sentiment_label == models.SentimentLabel.negative)
        .limit(30)
        .all()
    )

    if not negative_posts:
        return {}

    posts_text = "\n\n".join(
        f"[Post {i+1}] {(p.content or '')[:250]}"
        for i, p in enumerate(negative_posts)
    )

    system_prompt = (
        "You are a user research analyst. Extract the main complaint themes from these posts. "
        "Return a JSON object where each key is a theme name (snake_case), and the value has: "
        '{"frequency": N, "severity": "high"|"medium"|"low", "quotes": ["exact quote 1", ...], '
        '"description": "what users are complaining about"}. '
        "Return ONLY the JSON object."
    )

    user_prompt = f"""Problem: {campaign.campaign_name} — {campaign.description or ''}

Negative user posts:
{posts_text}

Extract 3-6 main complaint themes with supporting quotes."""

    try:
        response = call_llm(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=1000,
            temperature=0.3,
        )
        themes = extract_json(response)
        return themes if isinstance(themes, dict) else {}
    except Exception as e:
        print(f"[Themes] LLM extraction failed: {e}")
        return {}


# ─────────────────── COMPETITOR ANALYSIS ───────────────────

def analyze_competitors_llm(
    campaign_id: int,
    db: Session,
    num_competitors: int = 2,
) -> dict:
    """
    1. LLM identifies N real competitor apps by name.
    2. Searches Google Play specifically for those apps and fetches reviews.
    3. Stores reviews in GooglePlayData table.
    4. LLM analyzes strengths, weaknesses, gaps from real reviews.
    """
    campaign = db.query(models.Campaign).filter(
        models.Campaign.campaign_id == campaign_id
    ).first()
    if not campaign:
        return {}

    id_system = (
        "You are a market research expert. Given a startup idea, identify real competing "
        "apps that exist on the Google Play Store. "
        f"Return ONLY a JSON array of exactly {num_competitors} app names as they appear "
        "on Google Play. Example: [\"Otter.ai - AI Meeting Note Taker\", \"Notion\"]"
    )
    id_user = (
        f"Startup: {campaign.campaign_name}\n"
        f"Description: {campaign.description or 'N/A'}\n"
        f"Keywords: {campaign.keywords_text or 'N/A'}\n\n"
        f"Name {num_competitors} real competitor apps on Google Play for this idea. "
        "Return ONLY a JSON array."
    )

    try:
        response = call_llm(system_prompt=id_system, user_prompt=id_user, max_tokens=150, temperature=0.3)
        competitor_names = extract_json(response)
        if not isinstance(competitor_names, list) or not competitor_names:
            return {}
        competitor_names = [str(n) for n in competitor_names[:num_competitors]]
        print(f"[Competitors] LLM identified: {competitor_names}")
    except Exception as e:
        print(f"[Competitors] LLM identification failed: {e}")
        return {}

    try:
        from google_play_scraper import search, reviews as gp_reviews, Sort
    except ImportError:
        print("[Competitors] google-play-scraper not installed")
        return {}

    keyword_objs = crud.get_keywords_by_campaign(db, campaign_id)
    default_keyword_id = keyword_objs[0].keyword_id if keyword_objs else None

    all_app_data = {}

    for app_name in competitor_names:
        try:
            raw = search(app_name, n_hits=3, lang="en", country="us")
            candidates = raw[0] if isinstance(raw, tuple) else raw
            if not candidates:
                continue

            fetched_reviews = []
            chosen_app = None

            for candidate in candidates[:3]:
                app_id = candidate.get("appId", "")
                if not app_id:
                    continue
                try:
                    result, _ = gp_reviews(app_id, lang="en", country="us", count=40, sort=Sort.MOST_RELEVANT)
                    if result:
                        fetched_reviews = result
                        chosen_app = candidate
                        break
                except Exception:
                    continue

            if not chosen_app or not fetched_reviews:
                continue

            actual_name = chosen_app.get("title", app_name)
            app_id      = chosen_app.get("appId", "")
            app_rating  = chosen_app.get("score", 0)
            app_url     = chosen_app.get("url", "")
            developer   = chosen_app.get("developer", "")

            positive_quotes = []
            negative_quotes = []
            review_texts    = []

            for rev in fetched_reviews[:30]:
                review_id = rev.get("reviewId", "")
                content   = (rev.get("content", "") or "").strip()
                rating    = rev.get("score", 3)
                reviewer  = rev.get("userName", "")
                thumbs    = rev.get("thumbsUpCount", 0) or 0
                engagement = max(thumbs, 0) + max(0, 5 - rating)

                if not content:
                    continue

                short = content[:180]
                if rating >= 4 and len(positive_quotes) < 5:
                    positive_quotes.append(f'"{short}"')
                elif rating <= 2 and len(negative_quotes) < 5:
                    negative_quotes.append(f'"{short}"')

                review_texts.append(f"[{'★' * (rating or 3)}] {short}")

                if review_id and not db.query(models.GooglePlayData).filter(
                    models.GooglePlayData.campaign_id == campaign_id,
                    models.GooglePlayData.review_id == review_id,
                ).first():
                    db.add(models.GooglePlayData(
                        campaign_id=campaign_id,
                        keyword_id=default_keyword_id,
                        app_id=app_id,
                        app_name=actual_name,
                        app_url=app_url,
                        developer=developer,
                        app_rating=app_rating,
                        review_id=review_id,
                        review_content=content,
                        review_rating=rating,
                        reviewer_name=reviewer,
                        thumbs_up=thumbs,
                        engagement_score=engagement,
                    ))

            db.commit()
            all_app_data[actual_name] = {
                "rating":          app_rating,
                "reviews":         review_texts[:15],
                "positive_quotes": positive_quotes,
                "negative_quotes": negative_quotes,
            }

        except Exception as e:
            print(f"[Competitors] Failed to process {app_name}: {e}")
            continue

    if not all_app_data:
        return {}

    reviews_text = ""
    for name, data in all_app_data.items():
        reviews_text += f"\n\n═══ {name} (Rating: {data['rating']}/5) ═══\n"
        if data["positive_quotes"]:
            reviews_text += "Positive reviews:\n" + "\n".join(data["positive_quotes"]) + "\n"
        if data["negative_quotes"]:
            reviews_text += "Negative reviews:\n" + "\n".join(data["negative_quotes"]) + "\n"
        reviews_text += "All reviews (sample):\n" + "\n".join(data["reviews"][:10])

    app_names = list(all_app_data.keys())
    example_structure = "{" + ", ".join(
        f'"{n}": {{"strengths": [...], "weaknesses": [...], "gaps": [...], "rating": 0, "user_sentiment": "...", "top_positive_quote": "...", "top_negative_quote": "..."}}'
        for n in app_names
    ) + "}"

    analysis_system = (
        "You are a senior competitive analyst. You MUST return a single valid JSON object. "
        "No markdown, no explanation, no text outside the JSON. "
        f"The JSON must have exactly {len(app_names)} top-level keys — one per app. "
        f"Required structure: {example_structure}"
    )
    analysis_user = (
        f"Competitor apps for: {campaign.campaign_name}\n"
        f"Our idea: {campaign.description or 'N/A'}\n\n"
        f"Real user reviews:\n{reviews_text}\n\n"
        f"Return a single JSON object with keys: {app_names}. "
        "For each app include: strengths (3-5 items), weaknesses (3-5 specific complaints), "
        "gaps (2-4 market opportunities), rating (number), user_sentiment (1 sentence), "
        "top_positive_quote, top_negative_quote. ONLY output the JSON object."
    )

    try:
        response = call_llm(
            system_prompt=analysis_system,
            user_prompt=analysis_user,
            max_tokens=1500,
            temperature=0.3,
        )
        result = extract_json(response)
        if not isinstance(result, dict) or not result:
            return {}
        return result
    except Exception as e:
        print(f"[Competitors] LLM analysis failed: {e}")
        return {}


# ─────────────────── HELPERS ───────────────────

def _normalize_label(label: str) -> str:
    label = (label or "").lower().strip()
    if "positive" in label:
        return "positive"
    if "negative" in label:
        return "negative"
    return "neutral"


def _map_score(label: str, score: float) -> float:
    base = max(0.0, min(1.0, float(score)))
    if label == "positive":
        return base
    if label == "negative":
        return -base
    return 0.0
