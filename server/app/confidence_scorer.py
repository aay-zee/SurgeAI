"""
Confidence Scorer: Assesses the quality and completeness of collected validation data.
Returns a 0-100% confidence score indicating how reliable the validation results are.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from . import models
from datetime import datetime, timedelta, timezone


class ConfidenceScorer:
    """Evaluates data quality across all validation dimensions."""

    def __init__(self, campaign_id: int, db: Session):
        self.campaign_id = campaign_id
        self.db = db
        self.campaign = db.query(models.Campaign).filter(
            models.Campaign.campaign_id == campaign_id
        ).first()

    def calculate_confidence(self) -> dict:
        """
        Calculate confidence score (0-100%).

        Factors:
        1. Data volume (across platforms)
        2. Data diversity (sources represented)
        3. Sentiment analysis coverage (% of data analyzed)
        4. Data freshness (when was data collected)
        5. Minimum thresholds met

        Returns: {
            "confidence_score": 75,
            "confidence_percentage": "75%",
            "factors": {
                "data_volume": {"score": 80, "reason": "..."},
                "data_diversity": {"score": 90, "reason": "..."},
                "analysis_coverage": {"score": 100, "reason": "..."},
                "data_freshness": {"score": 85, "reason": "..."},
                "threshold_compliance": {"score": 70, "reason": "..."}
            },
            "warnings": ["..."]
        }
        """
        if not self.campaign:
            return {"error": "Campaign not found"}

        warnings = []
        factors = {}

        # 1. Data Volume
        factors["data_volume"] = self._evaluate_data_volume()
        if factors["data_volume"]["score"] < 50:
            warnings.append("Low overall data volume. Collect more data for better validation.")

        # 2. Data Diversity
        factors["data_diversity"] = self._evaluate_data_diversity()
        if factors["data_diversity"]["score"] < 50:
            warnings.append("Low platform diversity. Data from only a few sources.")

        # 3. Sentiment Analysis Coverage
        factors["analysis_coverage"] = self._evaluate_analysis_coverage()
        if factors["analysis_coverage"]["score"] < 80:
            warnings.append("Not all scraped data has been analyzed yet.")

        # 4. Data Freshness
        factors["data_freshness"] = self._evaluate_data_freshness()
        if factors["data_freshness"]["score"] < 40:
            warnings.append("Data is older than 7 days. Consider re-scraping for fresh insights.")

        # 5. Minimum Thresholds
        factors["threshold_compliance"] = self._evaluate_threshold_compliance()
        if factors["threshold_compliance"]["score"] < 60:
            warnings.append("Some validation dimensions lack minimum required data.")

        # Calculate overall confidence (average of all factors)
        scores = [f["score"] for f in factors.values()]
        overall_confidence = sum(scores) / len(scores) if scores else 0

        return {
            "confidence_score": round(overall_confidence),
            "confidence_percentage": f"{round(overall_confidence)}%",
            "factors": factors,
            "warnings": warnings
        }

    def _evaluate_data_volume(self) -> dict:
        """Score based on total data points collected across all platforms."""
        # Count scraped data
        reddit_count = self.db.query(models.ScrapedData).filter(
            models.ScrapedData.campaign_id == self.campaign_id,
            models.ScrapedData.platform == models.Platform.REDDIT
        ).count()

        hn_count = self.db.query(models.ScrapedData).filter(
            models.ScrapedData.campaign_id == self.campaign_id,
            models.ScrapedData.platform == models.Platform.HACKER_NEWS
        ).count()

        quora_count = self.db.query(models.QuoraData).filter(
            models.QuoraData.campaign_id == self.campaign_id
        ).count()

        ph_count = self.db.query(models.ProductHuntData).filter(
            models.ProductHuntData.campaign_id == self.campaign_id
        ).count()

        gp_count = self.db.query(models.GooglePlayData).filter(
            models.GooglePlayData.campaign_id == self.campaign_id
        ).count()

        se_count = 0

        total = reddit_count + hn_count + quora_count + ph_count + gp_count + se_count

        # Scoring: 0-500 items = 0%, 500-1000 = 50%, 1000+ = 100%
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
                "quora": quora_count,
                "product_hunt": ph_count,
                "google_play": gp_count,
                "stack_exchange": se_count,
                "total": total
            }
        }

    def _evaluate_data_diversity(self) -> dict:
        """Score based on representation across different platforms."""
        platforms_with_data = 0
        sources = {}

        # Check each platform for data
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

        if self.db.query(models.QuoraData).filter(
            models.QuoraData.campaign_id == self.campaign_id
        ).first():
            platforms_with_data += 1
            sources["quora"] = True

        if self.db.query(models.ProductHuntData).filter(
            models.ProductHuntData.campaign_id == self.campaign_id
        ).first():
            platforms_with_data += 1
            sources["product_hunt"] = True

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

        # Scoring: 1 platform = 20%, 2-3 = 50%, 4-5 = 80%, 6+ = 100%
        if platforms_with_data >= 6:
            score = 100
            reason = f"Excellent diversity: Data from {platforms_with_data} platforms."
        elif platforms_with_data >= 4:
            score = 80
            reason = f"Good diversity: Data from {platforms_with_data} platforms."
        elif platforms_with_data >= 2:
            score = 50
            reason = f"Moderate diversity: Data from {platforms_with_data} platforms. Add more sources."
        else:
            score = 20
            reason = f"Low diversity: Data from only {platforms_with_data} platform. Multiple sources recommended."

        return {
            "score": score,
            "reason": reason,
            "platforms_with_data": platforms_with_data,
            "sources": sources
        }

    def _evaluate_analysis_coverage(self) -> dict:
        """Score based on % of scraped data that has NLP sentiment analysis."""
        # Get total scraped data
        total_scraped = self.db.query(models.ScrapedData).filter(
            models.ScrapedData.campaign_id == self.campaign_id
        ).count()

        if total_scraped == 0:
            return {
                "score": 0,
                "reason": "No scraped data found yet.",
                "coverage_percentage": 0
            }

        # Get analyzed data
        analyzed = self.db.query(models.NLPAnalysis).filter(
            models.NLPAnalysis.data_id.in_(
                self.db.query(models.ScrapedData.data_id).filter(
                    models.ScrapedData.campaign_id == self.campaign_id
                )
            )
        ).count()

        coverage = (analyzed / total_scraped) * 100

        if coverage == 100:
            score = 100
            reason = f"Complete coverage: All {analyzed} data points analyzed."
        elif coverage >= 90:
            score = 90
            reason = f"Excellent coverage: {analyzed}/{total_scraped} ({coverage:.0f}%) analyzed."
        elif coverage >= 70:
            score = 70
            reason = f"Good coverage: {analyzed}/{total_scraped} ({coverage:.0f}%) analyzed."
        elif coverage >= 50:
            score = 50
            reason = f"Partial coverage: {analyzed}/{total_scraped} ({coverage:.0f}%) analyzed."
        else:
            score = 20
            reason = f"Low coverage: {analyzed}/{total_scraped} ({coverage:.0f}%) analyzed. Run NLP analysis."

        return {
            "score": score,
            "reason": reason,
            "analyzed": analyzed,
            "total_scraped": total_scraped,
            "coverage_percentage": coverage
        }

    def _evaluate_data_freshness(self) -> dict:
        """Score based on how recent the collected data is."""
        # Get most recent scraped data
        most_recent = self.db.query(models.ScrapedData).filter(
            models.ScrapedData.campaign_id == self.campaign_id
        ).order_by(models.ScrapedData.scraped_at.desc()).first()

        if not most_recent:
            return {
                "score": 0,
                "reason": "No data collected yet.",
                "days_old": None
            }

        now = datetime.now(timezone.utc)
        scraped = most_recent.scraped_at if most_recent.scraped_at.tzinfo else most_recent.scraped_at.replace(tzinfo=timezone.utc)
        days_old = (now - scraped).days

        if days_old == 0:
            score = 100
            reason = "Data collected today - maximum freshness."
        elif days_old <= 1:
            score = 95
            reason = f"Very fresh: Data from {days_old} day ago."
        elif days_old <= 3:
            score = 85
            reason = f"Fresh: Data from {days_old} days ago."
        elif days_old <= 7:
            score = 70
            reason = f"Reasonably fresh: Data from {days_old} days ago."
        elif days_old <= 14:
            score = 50
            reason = f"Aging: Data from {days_old} days ago. Consider re-scraping."
        elif days_old <= 30:
            score = 25
            reason = f"Old: Data from {days_old} days ago. Re-scraping recommended."
        else:
            score = 10
            reason = f"Very old: Data from {days_old} days ago. Re-scrape for fresh insights."

        return {
            "score": score,
            "reason": reason,
            "days_old": days_old,
            "most_recent_scrape": most_recent.scraped_at.isoformat()
        }

    def _evaluate_threshold_compliance(self) -> dict:
        """Score based on meeting minimum data thresholds per dimension."""
        warnings = []
        met_thresholds = 0
        total_checks = 4

        # Check 1: Market Size (Search Volume data)
        sv_count = self.db.query(models.SearchVolumeData).filter(
            models.SearchVolumeData.campaign_id == self.campaign_id
        ).count()
        if sv_count > 0:
            met_thresholds += 1
        else:
            warnings.append("Market Size: No search volume data. Run search volume scraper.")

        # Check 2: Problem Clarity — Stack Exchange removed, skip this check
        warnings.append("Problem Clarity: Stack Exchange data source unavailable.")

        # Check 3: Competitor Gap (Google Play reviews)
        gp_count = self.db.query(models.GooglePlayData).filter(
            models.GooglePlayData.campaign_id == self.campaign_id
        ).count()
        if gp_count >= 20:
            met_thresholds += 1
        else:
            warnings.append(f"Competitor Gap: Only {gp_count} Google Play reviews (need 20+).")

        # Check 4: General Sentiment (Reddit + Hacker News + Quora)
        general_count = (
            self.db.query(models.ScrapedData).filter(
                models.ScrapedData.campaign_id == self.campaign_id,
                models.ScrapedData.platform.in_([
                    models.Platform.REDDIT,
                    models.Platform.HACKER_NEWS
                ])
            ).count() +
            self.db.query(models.QuoraData).filter(
                models.QuoraData.campaign_id == self.campaign_id
            ).count()
        )
        if general_count >= 30:
            met_thresholds += 1
        else:
            warnings.append(f"General Sentiment: Only {general_count} items from discussion platforms (need 30+).")

        # Scoring: 0/4 = 0%, 1/4 = 25%, 2/4 = 50%, 3/4 = 75%, 4/4 = 100%
        score = (met_thresholds / total_checks) * 100

        if met_thresholds == total_checks:
            reason = "All validation dimensions have sufficient data."
        else:
            reason = f"Meeting {met_thresholds}/{total_checks} dimension thresholds."

        return {
            "score": score,
            "reason": reason,
            "met_thresholds": met_thresholds,
            "total_checks": total_checks,
            "warnings": warnings
        }
