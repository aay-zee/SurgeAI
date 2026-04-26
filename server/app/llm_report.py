"""
LLM Report Generator
Gathers all campaign data, builds a structured prompt, and calls the LLM
to generate a comprehensive startup validation report.
"""

import os
import requests
from sqlalchemy.orm import Session
from . import models, crud

HF_API_TOKEN: str = os.getenv("HF_API_TOKEN", "")
HF_SPACE_NAME: str = os.getenv("HF_SPACE_NAME", "")

_HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions"
_FALLBACK_MODEL = "meta-llama/Meta-Llama-3-8B-Instruct"


def _build_prompt(campaign_id: int, db: Session) -> str:
    campaign = db.query(models.Campaign).filter(
        models.Campaign.campaign_id == campaign_id
    ).first()
    if not campaign:
        raise ValueError("Campaign not found")

    keywords = [kw.keyword for kw in campaign.keywords]

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

    scraped_data = db.query(models.ScrapedData).filter(
        models.ScrapedData.campaign_id == campaign_id,
        models.ScrapedData.is_relevant == True,
    ).all()

    nlp_analyses = db.query(models.NLPAnalysis).filter(
        models.NLPAnalysis.data_id.in_([d.data_id for d in scraped_data])
    ).all() if scraped_data else []

    pos = sum(1 for a in nlp_analyses if a.sentiment_label == models.SentimentLabel.positive)
    neg = sum(1 for a in nlp_analyses if a.sentiment_label == models.SentimentLabel.negative)
    total_nlp = len(nlp_analyses) or 1
    pos_pct = round((pos / total_nlp) * 100)
    neg_pct = round((neg / total_nlp) * 100)
    neu_pct = 100 - pos_pct - neg_pct

    # Themes
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
        from .theme_extractor import ThemeExtractor
        extractor = ThemeExtractor(campaign_id, db)
        themes = extractor.extract_themes()
        if themes:
            lines = []
            for theme_name, data in sorted(themes.items(), key=lambda x: -x[1].get("frequency", 0)):
                freq = data.get("frequency", 0)
                quotes = data.get("quotes", [])
                lines.append(f"\n[{theme_name.upper().replace('_', ' ')}] — {freq} mentions")
                for q in quotes[:2]:
                    short = (q[:200] + "...") if len(q) > 200 else q
                    lines.append(f'  • "{short}"')
            themes_text = "\n".join(lines)

    # Competitors
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

    # Market signals
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
USER SENTIMENT  ({relevant_posts} relevant data points)
───────────────────────────────────────────────────────────────
Positive : {pos_pct}%  ({pos} posts)
Negative : {neg_pct}%  ({neg} posts)
Neutral  : {neu_pct}%

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
## 2. Key Shortcomings of This Idea
## 3. What Users Are Saying
## 4. Competitor Strengths
## 5. Competitor Weaknesses & Market Gaps
## 6. Specific Improvement Recommendations
## 7. Overall Verdict (Strong / Moderate / Weak, justified by overall score of {overall_score}/10)
═══════════════════════════════════════════════════════════════"""

    return prompt


def _call_space_api(prompt: str) -> str:
    from gradio_client import Client
    client = Client(HF_SPACE_NAME, token=HF_API_TOKEN if HF_API_TOKEN else None, verbose=False)
    try:
        result = client.predict(prompt, api_name="/predict")
        return str(result)
    except Exception:
        result = client.predict(prompt)
        return str(result)


def _call_hf_router(prompt: str) -> str:
    if not HF_API_TOKEN:
        raise ValueError("HF_API_TOKEN not set in server/.env")
    headers = {"Authorization": f"Bearer {HF_API_TOKEN}", "Content-Type": "application/json"}
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
    prompt = _build_prompt(campaign_id, db)

    report_text = None
    model_used = None

    if HF_SPACE_NAME:
        try:
            report_text = _call_space_api(prompt)
            model_used = f"Mistral-7B via Space ({HF_SPACE_NAME})"
        except Exception as e:
            print(f"[LLM Report] Space call failed: {e} — falling back to HF Router")

    if not report_text:
        report_text = _call_hf_router(prompt)
        model_used = "Llama-3-8B-Instruct (HF Router)"

    try:
        llm_analysis = db.query(models.LLMAnalysis).filter(
            models.LLMAnalysis.campaign_id == campaign_id
        ).first()
        if llm_analysis:
            llm_analysis.report_text = report_text
        else:
            llm_analysis = models.LLMAnalysis(campaign_id=campaign_id, report_text=report_text)
            db.add(llm_analysis)
        db.commit()
    except Exception as e:
        print(f"[LLM Report] Could not persist report: {e}")

    return {"status": "success", "campaign_id": campaign_id, "model_used": model_used, "report": report_text}
