"""
LLM Report Generator
Gathers all campaign data (including semantic pipeline results),
builds a structured prompt, and calls the LLM to generate
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

    # --- Relevance stats ---
    total_posts = db.query(models.ScrapedData).filter(
        models.ScrapedData.campaign_id == campaign_id
    ).count()
    relevant_posts = db.query(models.ScrapedData).filter(
        models.ScrapedData.campaign_id == campaign_id,
        models.ScrapedData.is_relevant == True,
    ).count()
    relevance_text = f"{relevant_posts} of {total_posts} posts were semantically relevant"
    if total_posts > 0:
        relevance_text += f" ({round(relevant_posts / total_posts * 100)}% relevance rate)"

    # --- Sentiment summary (from relevant posts only) ---
    scraped_data = db.query(models.ScrapedData).filter(
        models.ScrapedData.campaign_id == campaign_id,
        models.ScrapedData.is_relevant == True,
    ).all()

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

    # --- LLM-extracted themes (from LLMAnalysis if available, else fallback) ---
    llm_analysis = db.query(models.LLMAnalysis).filter(
        models.LLMAnalysis.campaign_id == campaign_id
    ).first()

    themes_text = "No theme data available."
    if llm_analysis and llm_analysis.themes:
        themes = llm_analysis.themes
        lines = []
        for theme_name, data in themes.items():
            if isinstance(data, dict):
                severity = data.get("severity", "medium")
                desc = data.get("description", "")
                quotes = data.get("quotes", [])
                lines.append(f"\n[{theme_name.upper().replace('_', ' ')}] — Severity: {severity}")
                if desc:
                    lines.append(f"  {desc}")
                for q in (quotes[:2] if isinstance(quotes, list) else []):
                    short = (str(q)[:200] + "...") if len(str(q)) > 200 else str(q)
                    lines.append(f'  • "{short}"')
        themes_text = "\n".join(lines) if lines else themes_text
    else:
        # Fallback to keyword-based themes
        from .theme_extractor import ThemeExtractor
        extractor = ThemeExtractor(campaign_id, db)
        themes = extractor.extract_themes()
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

    # --- Competitor analysis (from LLMAnalysis if available, else fallback) ---
    competitor_text = "No competitor data available."
    if llm_analysis and llm_analysis.competitor_analysis:
        competitors = llm_analysis.competitor_analysis
        lines = []
        for app_name, app_data in list(competitors.items())[:5]:
            if isinstance(app_data, dict):
                rating = app_data.get("rating", "N/A")
                lines.append(f"\n[{app_name}] — Rating: {rating}/5")
                strengths = app_data.get("strengths", [])
                weaknesses = app_data.get("weaknesses", [])
                if isinstance(strengths, list) and strengths:
                    lines.append(f"  Strengths: {', '.join(str(s) for s in strengths[:3])}")
                if isinstance(weaknesses, list) and weaknesses:
                    lines.append(f"  Weaknesses: {', '.join(str(w) for w in weaknesses[:3])}")
        competitor_text = "\n".join(lines) if lines else competitor_text
    else:
        from .theme_extractor import CompetitorThemeExtractor
        comp_extractor = CompetitorThemeExtractor(campaign_id, db)
        competitors = comp_extractor.extract_competitor_themes()
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
DATA QUALITY
───────────────────────────────────────────────────────────────
{relevance_text}

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
USER SENTIMENT  ({relevant_posts} relevant data points — Reddit, HackerNews, Quora, Google Play)
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
Write 5–7 sentences covering: (a) what the startup does and the core problem it solves, (b) the overall validation score and what it signals, (c) the size and direction of the market based on search volume and trend data, (d) what the sentiment data reveals about real user pain, (e) the single biggest opportunity and the single biggest risk. Be specific — mention actual numbers, percentages, and theme names from the data above.

## 2. Key Shortcomings of This Idea
List and explain 4–6 specific weaknesses, risks, or red flags based on the data. Be honest and specific.

## 3. What Users Are Saying
Synthesize real user sentiment and recurring pain points. Reference specific themes and quote real user feedback where available.

## 4. Competitor Strengths
Based on real Google Play reviews, what do existing competitors do well? Reference specific apps by name and quote actual user feedback where available. What keeps users loyal or satisfied?

## 5. Competitor Weaknesses & Market Gaps
Where do existing competitors fail their users? Quote specific complaints. List 3–5 concrete gaps your idea could exploit, and explain why each gap is an opportunity.

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
    Stores result in LLMAnalysis table.
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

    # Store report in LLMAnalysis
    try:
        llm_analysis = db.query(models.LLMAnalysis).filter(
            models.LLMAnalysis.campaign_id == campaign_id
        ).first()
        if llm_analysis:
            llm_analysis.report_text = report_text
        else:
            llm_analysis = models.LLMAnalysis(
                campaign_id=campaign_id,
                report_text=report_text,
            )
            db.add(llm_analysis)
        db.commit()
    except Exception as e:
        print(f"[LLM Report] Could not persist report: {e}")

    return {
        "status": "success",
        "campaign_id": campaign_id,
        "model_used": model_used,
        "report": report_text,
    }
