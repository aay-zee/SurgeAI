"""
Semantic Validation Pipeline — orchestrates the full analysis:
  1. Relevance filtering (embeddings)
  2. Batched sentiment analysis (LLM)
  3. Validation scoring (LLM)
  4. Theme extraction (LLM)
  5. Competitor analysis (LLM)
  6. Report generation (LLM)
"""

from sqlalchemy.orm import Session
from . import models
from .relevance_filter import filter_relevant_data
from .llm_analyzer import (
    batch_sentiment_analysis,
    llm_validation_scoring,
    extract_themes_llm,
    analyze_competitors_llm,
)
from .llm_report import generate_llm_report


def run_validation_pipeline(campaign_id: int, db: Session) -> dict:
    """
    Run the full semantic validation pipeline for a campaign.
    Steps: embed → filter → sentiment → scoring → themes → competitors → report.
    Returns a summary of all pipeline results.
    """
    results = {"campaign_id": campaign_id, "steps": {}}

    # Step 1: Relevance filtering
    print(f"[Pipeline] Step 1/6: Relevance filtering for campaign {campaign_id}...")
    try:
        relevance_stats = filter_relevant_data(campaign_id, db)
        results["steps"]["relevance_filter"] = relevance_stats
    except Exception as e:
        print(f"[Pipeline] Relevance filter failed: {e}")
        results["steps"]["relevance_filter"] = {"error": str(e)}
        # Mark all posts as relevant so pipeline can continue
        posts = db.query(models.ScrapedData).filter(
            models.ScrapedData.campaign_id == campaign_id
        ).all()
        for p in posts:
            p.is_relevant = True
        db.commit()
        relevance_stats = {"total": len(posts), "relevant": len(posts), "filtered_out": 0}

    # Step 2: Batched sentiment analysis
    print(f"[Pipeline] Step 2/6: Sentiment analysis for campaign {campaign_id}...")
    try:
        sentiment_result = batch_sentiment_analysis(campaign_id, db)
        results["steps"]["sentiment"] = sentiment_result
    except Exception as e:
        print(f"[Pipeline] Sentiment failed: {e}")
        results["steps"]["sentiment"] = {"error": str(e)}

    # Step 3: Validation scoring
    print(f"[Pipeline] Step 3/6: Validation scoring for campaign {campaign_id}...")
    try:
        scores = llm_validation_scoring(campaign_id, db)
        results["steps"]["validation_scores"] = scores
    except Exception as e:
        print(f"[Pipeline] Validation scoring failed: {e}")
        results["steps"]["validation_scores"] = {"error": str(e)}

    # Step 4: Theme extraction
    print(f"[Pipeline] Step 4/6: Theme extraction for campaign {campaign_id}...")
    try:
        themes = extract_themes_llm(campaign_id, db)
        results["steps"]["themes"] = themes
    except Exception as e:
        print(f"[Pipeline] Theme extraction failed: {e}")
        results["steps"]["themes"] = {"error": str(e)}
        themes = {}

    # Step 5: Competitor analysis
    print(f"[Pipeline] Step 5/6: Competitor analysis for campaign {campaign_id}...")
    try:
        competitors = analyze_competitors_llm(campaign_id, db)
        results["steps"]["competitors"] = competitors
    except Exception as e:
        print(f"[Pipeline] Competitor analysis failed: {e}")
        results["steps"]["competitors"] = {"error": str(e)}
        competitors = {}

    # Persist LLM analysis results
    try:
        llm_analysis = db.query(models.LLMAnalysis).filter(
            models.LLMAnalysis.campaign_id == campaign_id
        ).first()
        if llm_analysis:
            llm_analysis.validation_scores = results["steps"].get("validation_scores")
            llm_analysis.themes = themes
            llm_analysis.competitor_analysis = competitors
            llm_analysis.sentiment_results = results["steps"].get("sentiment")
            llm_analysis.relevance_stats = relevance_stats
        else:
            llm_analysis = models.LLMAnalysis(
                campaign_id=campaign_id,
                validation_scores=results["steps"].get("validation_scores"),
                themes=themes,
                competitor_analysis=competitors,
                sentiment_results=results["steps"].get("sentiment"),
                relevance_stats=relevance_stats,
            )
            db.add(llm_analysis)
        db.commit()
    except Exception as e:
        print(f"[Pipeline] Could not persist LLMAnalysis: {e}")

    # Step 6: Report generation
    print(f"[Pipeline] Step 6/6: Report generation for campaign {campaign_id}...")
    try:
        report = generate_llm_report(campaign_id, db)
        results["steps"]["report"] = {"status": "success"}
        results["report"] = report.get("report", "")
    except Exception as e:
        print(f"[Pipeline] Report generation failed: {e}")
        results["steps"]["report"] = {"error": str(e)}

    print(f"[Pipeline] Complete for campaign {campaign_id}")
    results["status"] = "completed"
    return results
