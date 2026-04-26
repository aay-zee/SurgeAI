"""
Confidence Scorer: Assesses the quality and completeness of collected validation data.
Returns a 0-100% confidence score indicating how reliable the validation results are.
"""

from sqlalchemy.orm import Session
from . import models
from datetime import datetime, timezone


class ConfidenceScorer:
    """Evaluates data quality across all validation dimensions."""

    def __init__(self, campaign_id: int, db: Session):
        self.campaign_id = campaign_id
        self.db = db
        self.campaign = db.query(models.Campaign).filter(
            models.Campaign.campaign_id == campaign_id
        ).first()

    def calculate_confidence(self) -> dict:
        if not self.campaign:
            return {"error": "Campaign not found"}

        warnings = []
        factors = {}

        factors["data_volume"] = self._evaluate_data_volume()
        if factors["data_volume"]["score"] < 50:
            warnings.append("Low overall data volume. Collect more data for better validation.")

        factors["data_diversity"] = self._evaluate_data_diversity()
        if factors["data_diversity"]["score"] < 50:
            warnings.append("Low platform diversity. Data from only a few sources.")

        factors["analysis_coverage"] = self._evaluate_analysis_coverage()
        if factors["analysis_coverage"]["score"] < 80:
            warnings.append("Not all scraped data has been analyzed yet.")

        factors["data_freshness"] = self._evaluate_data_freshness()
        if factors["data_freshness"]["score"] < 40:
            warnings.append("Data is older than 7 days. Consider re-scraping for fresh insights.")

        factors["threshold_compliance"] = self._evaluate_threshold_compliance()
        if factors["threshold_compliance"]["score"] < 60:
            warnings.append("Some validation dimensions lack minimum required data.")

        scores = [f["score"] for f in factors.values()]
        overall_confidence = sum(scores) / len(scores) if scores else 0

        return {
            "confidence_score": round(overall_confidence),
            "confidence_percentage": f"{round(overall_confidence)}%",
            "factors": factors,
            "warnings": warnings
        }

    def _evaluate_data_volume(self) -> dict:
        reddit_count = self.db.query(models.ScrapedData).filter(
            models.ScrapedData.campaign_id == self.campaign_id,
            models.ScrapedData.platform == models.Platform.REDDIT
        ).count()

        hn_count = self.db.query(models.ScrapedData).filter(
            models.ScrapedData.campaign_id == self.campaign_id,
            models.ScrapedData.platform == models.Platform.HACKER_NEWS
        ).count()

        gp_count = self.db.query(models.GooglePlayData).filter(
            models.GooglePlayData.campaign_id == self.campaign_id
        ).count()

        total = reddit_count + hn_count + gp_count

        if total >= 1000:
            score = 100
            reason = f"Excellent: {total} total data points collected across platforms."
        elif total >= 500:
            score = 50 + (total - 500) / 10
            reason = f"Good: {total} data points. Aim for 1000+ for highest confidence."
        elif total >= 100:
            score = 20 + (total - 100) / 20
            reason = f"Moderate: {total} data points. Recommended: 500+."
        else:
            score = max(0, (total / 100) * 20)
            reason = f"Low: Only {total} data points. Collect at least 100 for basic validation."

        return {
            "score": score,
            "reason": reason,
            "breakdown": {
                "reddit": reddit_count,
                "hacker_news": hn_count,
                "google_play": gp_count,
                "total": total
            }
        }

    def _evaluate_data_diversity(self) -> dict:
        platforms_with_data = 0
        sources = {}

        if self.db.query(models.ScrapedData).filter(
            models.ScrapedData.campaign_id == self.campaign_id,
            models.ScrapedData.platform == models.Platform.REDDIT
        ).first():
            platforms_with_data += 1
            sources["reddit"] = True

        if self.db.query(models.ScrapedData).filter(
            models.ScrapedData.campaign_id == self.campaign_id,
            models.ScrapedData.platform == models.Platform.HACKER_NEWS
        ).first():
            platforms_with_data += 1
            sources["hacker_news"] = True

        if self.db.query(models.GooglePlayData).filter(
            models.GooglePlayData.campaign_id == self.campaign_id
        ).first():
            platforms_with_data += 1
            sources["google_play"] = True

        if self.db.query(models.SearchVolumeData).filter(
            models.SearchVolumeData.campaign_id == self.campaign_id
        ).first():
            platforms_with_data += 1
            sources["search_volume"] = True

        if platforms_with_data >= 4:
            score = 100
            reason = f"Excellent diversity: Data from {platforms_with_data} platforms."
        elif platforms_with_data >= 3:
            score = 80
            reason = f"Good diversity: Data from {platforms_with_data} platforms."
        elif platforms_with_data >= 2:
            score = 50
            reason = f"Moderate diversity: Data from {platforms_with_data} platforms. Add more sources."
        else:
            score = 20
            reason = f"Low diversity: Data from only {platforms_with_data} platform."

        return {"score": score, "reason": reason, "platforms_with_data": platforms_with_data, "sources": sources}

    def _evaluate_analysis_coverage(self) -> dict:
        total_scraped = self.db.query(models.ScrapedData).filter(
            models.ScrapedData.campaign_id == self.campaign_id
        ).count()

        if total_scraped == 0:
            return {"score": 0, "reason": "No scraped data found yet.", "coverage_percentage": 0}

        analyzed = self.db.query(models.NLPAnalysis).filter(
            models.NLPAnalysis.data_id.in_(
                self.db.query(models.ScrapedData.data_id).filter(
                    models.ScrapedData.campaign_id == self.campaign_id
                )
            )
        ).count()

        coverage = (analyzed / total_scraped) * 100

        if coverage == 100:
            score, reason = 100, f"Complete coverage: All {analyzed} data points analyzed."
        elif coverage >= 90:
            score, reason = 90, f"Excellent coverage: {analyzed}/{total_scraped} ({coverage:.0f}%) analyzed."
        elif coverage >= 70:
            score, reason = 70, f"Good coverage: {analyzed}/{total_scraped} ({coverage:.0f}%) analyzed."
        elif coverage >= 50:
            score, reason = 50, f"Partial coverage: {analyzed}/{total_scraped} ({coverage:.0f}%) analyzed."
        else:
            score, reason = 20, f"Low coverage: {analyzed}/{total_scraped} ({coverage:.0f}%) analyzed."

        return {"score": score, "reason": reason, "analyzed": analyzed, "total_scraped": total_scraped, "coverage_percentage": coverage}

    def _evaluate_data_freshness(self) -> dict:
        most_recent = self.db.query(models.ScrapedData).filter(
            models.ScrapedData.campaign_id == self.campaign_id
        ).order_by(models.ScrapedData.scraped_at.desc()).first()

        if not most_recent:
            return {"score": 0, "reason": "No data collected yet.", "days_old": None}

        now = datetime.now(timezone.utc)
        scraped = most_recent.scraped_at if most_recent.scraped_at.tzinfo else most_recent.scraped_at.replace(tzinfo=timezone.utc)
        days_old = (now - scraped).days

        if days_old == 0:
            score, reason = 100, "Data collected today - maximum freshness."
        elif days_old <= 1:
            score, reason = 95, f"Very fresh: Data from {days_old} day ago."
        elif days_old <= 3:
            score, reason = 85, f"Fresh: Data from {days_old} days ago."
        elif days_old <= 7:
            score, reason = 70, f"Reasonably fresh: Data from {days_old} days ago."
        elif days_old <= 14:
            score, reason = 50, f"Aging: Data from {days_old} days ago. Consider re-scraping."
        elif days_old <= 30:
            score, reason = 25, f"Old: Data from {days_old} days ago. Re-scraping recommended."
        else:
            score, reason = 10, f"Very old: Data from {days_old} days ago. Re-scrape for fresh insights."

        return {"score": score, "reason": reason, "days_old": days_old}

    def _evaluate_threshold_compliance(self) -> dict:
        warnings = []
        met_thresholds = 0
        total_checks = 3

        sv_count = self.db.query(models.SearchVolumeData).filter(
            models.SearchVolumeData.campaign_id == self.campaign_id
        ).count()
        if sv_count > 0:
            met_thresholds += 1
        else:
            warnings.append("Market Size: No search volume data.")

        gp_count = self.db.query(models.GooglePlayData).filter(
            models.GooglePlayData.campaign_id == self.campaign_id
        ).count()
        if gp_count >= 20:
            met_thresholds += 1
        else:
            warnings.append(f"Competitor Gap: Only {gp_count} Google Play reviews (need 20+).")

        general_count = self.db.query(models.ScrapedData).filter(
            models.ScrapedData.campaign_id == self.campaign_id,
            models.ScrapedData.platform.in_([models.Platform.REDDIT, models.Platform.HACKER_NEWS])
        ).count()
        if general_count >= 30:
            met_thresholds += 1
        else:
            warnings.append(f"General Sentiment: Only {general_count} discussion posts (need 30+).")

        score = (met_thresholds / total_checks) * 100
        reason = "All validation dimensions have sufficient data." if met_thresholds == total_checks else f"Meeting {met_thresholds}/{total_checks} dimension thresholds."

        return {"score": score, "reason": reason, "met_thresholds": met_thresholds, "total_checks": total_checks, "warnings": warnings}
