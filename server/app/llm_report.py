"""
LLM Report Generator
Gathers all campaign data, builds a structured prompt,
and calls the HuggingFace Space (Mistral 7B) to generate
a comprehensive startup validation report.
"""

import os
import requests
from sqlalchemy.orm import Session
from . import models, crud

HF_API_TOKEN: str = os.getenv("HF_API_TOKEN", "")
HF_SPACE_NAME: str = os.getenv("HF_SPACE_NAME", "ayazkahloon7/SurgeAi")

# HuggingFace Router — confirmed working
_HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions"
_FALLBACK_MODEL = "meta-llama/Meta-Llama-3-8B-Instruct"


def _build_prompt(campaign_id: int, db: Session) -> str:
    """Build the full structured prompt from all campaign data in the DB."""

    campaign = db.query(models.Campaign).filter(
        models.Campaign.campaign_id == campaign_id
    ).first()
    if not campaign:
        raise ValueError("Campaign not found")

    keywords = [kw.keyword for kw in campaign.keywords]

    # --- Validation scores ---
    vs = db.query(models.ValidationScore).filter(
        models.ValidationScore.campaign_id == campaign_id
    ).first()

    scores_text = "Not yet calculated."
    overall_score = "N/A"
    if vs:
        overall_score = f"{vs.overall_score:.1f}" if vs.overall_score else "N/A"
        scores_text = f"""
Market Size:              {vs.market_size}/10 — {vs.market_size_reason or 'N/A'}
Demand:                   {vs.demand}/10 — {vs.demand_reason or 'N/A'}
Problem Clarity:          {vs.problem_clarity}/10 — {vs.problem_clarity_reason or 'N/A'}
Competitor Gap:           {vs.competitor_gap}/10 — {vs.competitor_gap_reason or 'N/A'}
Technical Feasibility:    {vs.technical_feasibility}/10 — {vs.technical_feasibility_reason or 'N/A'}
Market Growth:            {vs.market_growth}/10 — {vs.market_growth_reason or 'N/A'}
Pain Point Severity:      {vs.pain_point_severity}/10 — {vs.pain_point_severity_reason or 'N/A'}
Monetization Potential:   {vs.monetization_potential}/10 — {vs.monetization_potential_reason or 'N/A'}
OVERALL SCORE:            {overall_score}/10""".strip()

    # --- Sentiment summary ---
    scraped_data = db.query(models.ScrapedData).filter(
        models.ScrapedData.campaign_id == campaign_id
    ).all()
    total_posts = len(scraped_data)

    nlp_analyses = db.query(models.NLPAnalysis).filter(
        models.NLPAnalysis.data_id.in_([d.data_id for d in scraped_data])
    ).all() if scraped_data else []

    pos = sum(1 for a in nlp_analyses if a.sentiment_label == models.SentimentLabel.positive)
    neg = sum(1 for a in nlp_analyses if a.sentiment_label == models.SentimentLabel.negative)
    neu = len(nlp_analyses) - pos - neg
    total_nlp = len(nlp_analyses) or 1
    pos_pct = round((pos / total_nlp) * 100)
    neg_pct = round((neg / total_nlp) * 100)
    neu_pct = 100 - pos_pct - neg_pct

    # --- Themes (pain points) ---
    from .theme_extractor import ThemeExtractor
    extractor = ThemeExtractor(campaign_id, db)
    themes = extractor.extract_themes()

    themes_text = "No theme data available."
    if themes:
        lines = []
        for theme_name, data in sorted(themes.items(), key=lambda x: -x[1].get("frequency", 0)):
            freq = data.get("frequency", 0)
            sources = ", ".join(str(s) for s in data.get("sources", []))
            quotes = data.get("quotes", [])
            lines.append(f"\n[{theme_name.upper().replace('_', ' ')}] — {freq} mentions across {sources}")
            for q in quotes[:2]:
                short = (q[:200] + "...") if len(q) > 200 else q
                lines.append(f'  • "{short}"')
        themes_text = "\n".join(lines)

    # --- Competitor analysis ---
    from .theme_extractor import CompetitorThemeExtractor
    comp_extractor = CompetitorThemeExtractor(campaign_id, db)
    competitors = comp_extractor.extract_competitor_themes()

    competitor_text = "No competitor data available."
    if competitors:
        lines = []
        for app_name, app_data in list(competitors.items())[:5]:
            rating = app_data.get("rating", "N/A")
            review_count = app_data.get("review_count", 0)
            lines.append(f"\n[{app_name}] — Rating: {rating}/5 ({review_count} reviews)")
            strengths = app_data.get("strengths", {})
            weaknesses = app_data.get("weaknesses", {})
            if strengths:
                lines.append(f"  Strengths: {', '.join(list(strengths.keys())[:3])}")
            if weaknesses:
                lines.append(f"  Weaknesses: {', '.join(list(weaknesses.keys())[:3])}")
        competitor_text = "\n".join(lines)

    # --- Market signals ---
    search_vols = db.query(models.SearchVolumeData).filter(
        models.SearchVolumeData.campaign_id == campaign_id
    ).all()
    trends = db.query(models.GoogleTrendsPoint).filter(
        models.GoogleTrendsPoint.campaign_id == campaign_id
    ).order_by(models.GoogleTrendsPoint.trend_date).all()

    avg_volume = int(sum(sv.monthly_volume for sv in search_vols) / len(search_vols)) if search_vols else 0
    cpcs = [sv.cpc for sv in search_vols if sv.cpc]
    avg_cpc = round(sum(cpcs) / len(cpcs), 2) if cpcs else 0
    trend_dir = "unknown"
    if len(trends) >= 2:
        trend_dir = "rising" if trends[-1].interest > trends[0].interest else (
            "falling" if trends[-1].interest < trends[0].interest else "stable"
        )
    elif search_vols:
        rising = sum(1 for sv in search_vols if sv.trend_direction == "rising")
        trend_dir = "rising" if rising > len(search_vols) / 2 else "stable"

    # === BUILD THE FINAL PROMPT ===
    prompt = f"""You are a senior startup analyst with deep expertise in market validation. \
Generate a comprehensive, data-driven startup validation report based on real scraped market data.

═══════════════════════════════════════════════════════════════
STARTUP IDEA: {campaign.campaign_name}
═══════════════════════════════════════════════════════════════
Description: {campaign.description or 'Not provided'}
Keywords Tracked: {', '.join(keywords)}

───────────────────────────────────────────────────────────────
MARKET SIGNALS
───────────────────────────────────────────────────────────────
Monthly Search Volume : {avg_volume:,}
Market Trend          : {trend_dir}
Avg Cost Per Click    : ${avg_cpc}

───────────────────────────────────────────────────────────────
VALIDATION SCORES (1–10)
───────────────────────────────────────────────────────────────
{scores_text}

───────────────────────────────────────────────────────────────
USER SENTIMENT  ({total_posts} data points — Reddit, HackerNews, Quora, Stack Exchange)
───────────────────────────────────────────────────────────────
Positive : {pos_pct}%  ({pos} posts)
Negative : {neg_pct}%  ({neg} posts)
Neutral  : {neu_pct}%  ({neu} posts)

───────────────────────────────────────────────────────────────
MAIN USER PAIN POINTS & COMPLAINT THEMES
───────────────────────────────────────────────────────────────
{themes_text}

───────────────────────────────────────────────────────────────
COMPETITOR ANALYSIS  (from Google Play reviews)
───────────────────────────────────────────────────────────────
{competitor_text}

═══════════════════════════════════════════════════════════════
Based on all the data above, write a thorough validation report with these exact sections:

## 1. Executive Summary
Summarize the startup idea and the most important findings in 3–4 sentences.

## 2. Key Shortcomings of This Idea
List and explain 4–6 specific weaknesses, risks, or red flags based on the data. Be honest and specific.

## 3. What Users Are Saying
Synthesize real user sentiment and recurring pain points. Reference specific themes and quote real user feedback where available.

## 4. Competitor Strengths
Based on the Google Play data, what do existing competitors do well? What keeps users loyal or satisfied?

## 5. Competitor Weaknesses & Market Gaps
Where do existing competitors fail their users? List specific gaps that your idea could exploit.

## 6. Specific Improvement Recommendations
Provide 5–7 concrete, actionable recommendations. Each should be specific and directly tied to the data.

## 7. Overall Verdict
Give a final verdict on idea viability: Strong / Moderate / Weak. Justify it using the overall validation score of {overall_score}/10 and the data patterns.
═══════════════════════════════════════════════════════════════"""

    return prompt


def _call_space_api(prompt: str) -> str:
    """Call the HuggingFace Gradio Space via gradio_client."""
    from gradio_client import Client
    client = Client(
        HF_SPACE_NAME,
        token=HF_API_TOKEN if HF_API_TOKEN else None,
        verbose=False,
    )
    try:
        result = client.predict(prompt, api_name="/predict")
        return str(result)
    except Exception:
        result = client.predict(prompt)
        return str(result)


def _call_hf_router(prompt: str) -> str:
    """Call HuggingFace Router directly (Llama-3-8B fallback — always works)."""
    if not HF_API_TOKEN:
        raise ValueError("HF_API_TOKEN not set in server/.env")

    headers = {
        "Authorization": f"Bearer {HF_API_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": _FALLBACK_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 2000,
        "temperature": 0.7,
    }
    resp = requests.post(_HF_ROUTER_URL, headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def generate_llm_report(campaign_id: int, db: Session) -> dict:
    """
    Main entry point: build prompt from DB data, call LLM, return report.
    Tries the Gradio Space first; falls back to HF Router (Llama-3-8B).
    """
    prompt = _build_prompt(campaign_id, db)

    report_text = None
    model_used = None

    # 1. Try Gradio Space (Mistral 7B)
    try:
        report_text = _call_space_api(prompt)
        model_used = f"Mistral-7B via Space ({HF_SPACE_NAME})"
    except Exception as e:
        print(f"[LLM Report] Space call failed: {e} — falling back to HF Router")

    # 2. Fallback: HF Router (Llama-3-8B, confirmed working)
    if not report_text:
        report_text = _call_hf_router(prompt)
        model_used = "Llama-3-8B-Instruct (HF Router)"

    return {
        "status": "success",
        "campaign_id": campaign_id,
        "model_used": model_used,
        "report": report_text,
    }
