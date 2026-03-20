"""
Validation Scorer: Rule-based scoring of 8 dimensions for market validation.
Calculates scores from 1-10 for each dimension based on scraped data.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from . import models
from .crud import get_keywords_by_campaign


class ValidationScorer:
    """Scores a campaign across 8 validation dimensions."""

    def __init__(self, campaign_id: int, db: Session):
        self.campaign_id = campaign_id
        self.db = db
        self.campaign = db.query(models.Campaign).filter(
            models.Campaign.campaign_id == campaign_id
        ).first()

    def calculate_all_scores(self) -> dict:
        """Calculate all 8 dimension scores. Returns comprehensive scoring dict."""
        if not self.campaign:
            return {"error": "Campaign not found"}

        scores = {
            "market_size": self.score_market_size(),
            "demand": self.score_demand(),
            "problem_clarity": self.score_problem_clarity(),
            "competitor_gap": self.score_competitor_gap(),
            "technical_feasibility": self.score_technical_feasibility(),
            "market_growth": self.score_market_growth(),
            "pain_point_severity": self.score_pain_point_severity(),
            "monetization_potential": self.score_monetization_potential(),
        }

        # Calculate overall score (average of all 8 dimensions)
        dimension_scores = [v["score"] for v in scores.values() if isinstance(v, dict) and "score" in v]
        scores["overall_score"] = round(sum(dimension_scores) / len(dimension_scores), 1) if dimension_scores else 0

        return scores

    # ==================== DIMENSION 1: MARKET SIZE ====================
    def score_market_size(self) -> dict:
        """
        Score based on monthly search volume.
        Scale: < 1K (1/10) → 100K+ (10/10)
        """
        search_volumes = self.db.query(models.SearchVolumeData).filter(
            models.SearchVolumeData.campaign_id == self.campaign_id
        ).all()

        if not search_volumes:
            return {"score": 3, "reason": "No search volume data available"}

        avg_volume = sum(sv.monthly_volume for sv in search_volumes) / len(search_volumes)

        if avg_volume >= 100000:
            score = 10
            reason = f"Mass market: {int(avg_volume):,} avg monthly searches"
        elif avg_volume >= 50000:
            score = 9
            reason = f"Large market: {int(avg_volume):,} avg monthly searches"
        elif avg_volume >= 10000:
            score = 7
            reason = f"Viable niche: {int(avg_volume):,} avg monthly searches"
        elif avg_volume >= 1000:
            score = 5
            reason = f"Small niche: {int(avg_volume):,} avg monthly searches"
        else:
            score = 2
            reason = f"Very niche: {int(avg_volume):,} avg monthly searches"

        return {"score": score, "reason": reason}

    # ==================== DIMENSION 2: DEMAND ====================
    def score_demand(self) -> dict:
        """
        Score based on sentiment positivity and mention frequency.
        - Positive sentiment = high demand
        - High frequency = high interest
        """
        scraped_data = self.db.query(models.ScrapedData).filter(
            models.ScrapedData.campaign_id == self.campaign_id
        ).all()

        if not scraped_data:
            return {"score": 3, "reason": "No scraped data yet"}

        # Get sentiment scores
        nlp_analyses = self.db.query(models.NLPAnalysis).filter(
            models.NLPAnalysis.data_id.in_([d.data_id for d in scraped_data])
        ).all()

        if not nlp_analyses:
            return {"score": 4, "reason": f"{len(scraped_data)} mentions, sentiment not analyzed"}

        # Calculate sentiment average
        sentiment_scores = [a.sentiment_score for a in nlp_analyses if a.sentiment_score]
        if sentiment_scores:
            avg_sentiment = sum(sentiment_scores) / len(sentiment_scores)
        else:
            avg_sentiment = 0

        # Count positive mentions
        positive_count = sum(1 for a in nlp_analyses if a.sentiment_label == models.SentimentLabel.positive)
        positive_pct = (positive_count / len(nlp_analyses)) * 100 if nlp_analyses else 0

        # Score based on sentiment and volume
        total_mentions = len(scraped_data)

        if positive_pct >= 70 and total_mentions >= 100:
            score = 10
            reason = f"Strong demand: 70%+ positive sentiment, {total_mentions} mentions"
        elif positive_pct >= 60 and total_mentions >= 50:
            score = 8
            reason = f"Good demand: {positive_pct:.0f}% positive, {total_mentions} mentions"
        elif positive_pct >= 50 and total_mentions >= 30:
            score = 6
            reason = f"Mixed demand: {positive_pct:.0f}% positive, {total_mentions} mentions"
        elif total_mentions >= 20:
            score = 4
            reason = f"Low demand: {positive_pct:.0f}% positive, {total_mentions} mentions"
        else:
            score = 2
            reason = f"Insufficient data: Only {total_mentions} mentions"

        return {"score": score, "reason": reason}

    # ==================== DIMENSION 3: PROBLEM CLARITY ====================
    def score_problem_clarity(self) -> dict:
        """
        Score based on clarity of the problem from Stack Exchange.
        - High % answered questions = problem is clear
        - Many unanswered = problem is unclear
        """
        se_data = []

        if not se_data:
            return {"score": 4, "reason": "No Stack Exchange data"}

        answered_count = sum(1 for q in se_data if q.is_answered)
        answered_pct = (answered_count / len(se_data)) * 100 if se_data else 0

        if answered_pct >= 80:
            score = 10
            reason = f"Very clear problem: {answered_pct:.0f}% of questions answered"
        elif answered_pct >= 60:
            score = 8
            reason = f"Clear problem: {answered_pct:.0f}% of questions answered"
        elif answered_pct >= 40:
            score = 6
            reason = f"Moderately clear: {answered_pct:.0f}% of questions answered"
        elif answered_pct >= 20:
            score = 4
            reason = f"Unclear: {answered_pct:.0f}% of questions answered"
        else:
            score = 2
            reason = f"Very unclear: Only {answered_pct:.0f}% of questions answered"

        return {"score": score, "reason": reason}

    # ==================== DIMENSION 4: COMPETITOR GAP ====================
    def score_competitor_gap(self) -> dict:
        """
        Score based on negative reviews in Google Play.
        - High % negative = bigger gap opportunity
        - Specific complaints = actionable gap
        """
        gplay_data = self.db.query(models.GooglePlayData).filter(
            models.GooglePlayData.campaign_id == self.campaign_id
        ).all()

        if not gplay_data:
            return {"score": 4, "reason": "No Google Play competitor data"}

        # Count low-rated reviews (1-2 stars)
        low_rated = sum(1 for r in gplay_data if r.review_rating and r.review_rating <= 2)
        low_rated_pct = (low_rated / len(gplay_data)) * 100 if gplay_data else 0

        # Get NLP analysis for competitor complaints
        gplay_data_ids = [d.gp_data_id for d in gplay_data]
        scraped_gplay = self.db.query(models.ScrapedData).filter(
            models.ScrapedData.post_id.like(f"gp_{self.campaign_id}%")
        ).all()

        negative_count = 0
        if scraped_gplay:
            gplay_analyses = self.db.query(models.NLPAnalysis).filter(
                models.NLPAnalysis.data_id.in_([d.data_id for d in scraped_gplay])
            ).all()
            negative_count = sum(1 for a in gplay_analyses if a.sentiment_label == models.SentimentLabel.negative)

        # Score based on negative sentiment + low ratings
        if low_rated_pct >= 40 and negative_count >= 20:
            score = 9
            reason = f"Huge gap: {low_rated_pct:.0f}% negative reviews ({negative_count} complaints)"
        elif low_rated_pct >= 30 and negative_count >= 10:
            score = 7
            reason = f"Clear gap: {low_rated_pct:.0f}% negative reviews ({negative_count} complaints)"
        elif low_rated_pct >= 20:
            score = 5
            reason = f"Some gap: {low_rated_pct:.0f}% negative reviews"
        elif low_rated_pct >= 10:
            score = 3
            reason = f"Minor gaps: Only {low_rated_pct:.0f}% negative"
        else:
            score = 2
            reason = f"Competitors well-liked: {low_rated_pct:.0f}% negative"

        return {"score": score, "reason": reason}

    # ==================== DIMENSION 5: TECHNICAL FEASIBILITY ====================
    def score_technical_feasibility(self) -> dict:
        """
        Score based on Stack Exchange - if solutions exist = feasible.
        - Accepted answers = proven solutions
        - High votes = well-understood problem
        """
        se_data = []

        if not se_data:
            return {"score": 5, "reason": "No technical discussion data"}

        # Check for accepted answers
        with_answers = sum(1 for q in se_data if q.accepted_answer and len(q.accepted_answer) > 100)
        answer_pct = (with_answers / len(se_data)) * 100 if se_data else 0

        # Check vote count (high votes = well-understood)
        avg_votes = sum(q.votes for q in se_data) / len(se_data) if se_data else 0

        if answer_pct >= 60 and avg_votes >= 10:
            score = 9
            reason = f"Very feasible: {answer_pct:.0f}% have solutions, avg {avg_votes:.0f} votes"
        elif answer_pct >= 50 or avg_votes >= 15:
            score = 7
            reason = f"Feasible: {answer_pct:.0f}% have solutions"
        elif answer_pct >= 30:
            score = 5
            reason = f"Moderately feasible: {answer_pct:.0f}% have solutions"
        elif answer_pct >= 10:
            score = 3
            reason = f"Challenging: Only {answer_pct:.0f}% have solutions"
        else:
            score = 2
            reason = "Limited proven solutions available"

        return {"score": score, "reason": reason}

    # ==================== DIMENSION 6: MARKET GROWTH ====================
    def score_market_growth(self) -> dict:
        """
        Score based on search trends (Google Trends) and volume trends.
        - Rising trend = growing market
        - Stable = mature
        - Falling = declining
        """
        search_vols = self.db.query(models.SearchVolumeData).filter(
            models.SearchVolumeData.campaign_id == self.campaign_id
        ).all()

        trends = self.db.query(models.GoogleTrendsPoint).filter(
            models.GoogleTrendsPoint.campaign_id == self.campaign_id
        ).order_by(models.GoogleTrendsPoint.trend_date).all()

        # Check search volume trends
        rising_sv = sum(1 for sv in search_vols if sv.trend_direction == "rising")
        falling_sv = sum(1 for sv in search_vols if sv.trend_direction == "falling")

        # Check Google Trends direction
        if len(trends) >= 2:
            recent_trend = trends[-1].interest
            previous_trend = trends[-10].interest if len(trends) >= 10 else trends[0].interest
            trend_direction = "rising" if recent_trend > previous_trend else ("falling" if recent_trend < previous_trend else "stable")
        else:
            trend_direction = "stable"

        # Scoring
        rising_pct = (rising_sv / len(search_vols)) * 100 if search_vols else 0

        if (trend_direction == "rising" and rising_pct >= 50) or rising_pct >= 70:
            score = 10
            reason = "Rapidly growing market"
        elif trend_direction == "rising" or rising_pct >= 50:
            score = 8
            reason = f"Growing market: {rising_pct:.0f}% keywords trending up"
        elif trend_direction == "stable":
            score = 6
            reason = "Stable, mature market"
        elif rising_pct >= 20:
            score = 4
            reason = f"Mixed trends: {rising_pct:.0f}% growing, rest stable/declining"
        else:
            score = 2
            reason = "Declining market interest"

        return {"score": score, "reason": reason}

    # ==================== DIMENSION 7: PAIN POINT SEVERITY ====================
    def score_pain_point_severity(self) -> dict:
        """
        Score based on negative sentiment clustering and frequency.
        - High frequency negative = severe pain point
        - Many sources mentioning same issue = severe
        """
        scraped_data = self.db.query(models.ScrapedData).filter(
            models.ScrapedData.campaign_id == self.campaign_id
        ).all()

        if not scraped_data:
            return {"score": 3, "reason": "No data to assess pain points"}

        # Get negative sentiments
        nlp_analyses = self.db.query(models.NLPAnalysis).filter(
            models.NLPAnalysis.data_id.in_([d.data_id for d in scraped_data])
        ).all()

        negative_count = sum(1 for a in nlp_analyses if a.sentiment_label == models.SentimentLabel.negative)
        negative_pct = (negative_count / len(nlp_analyses)) * 100 if nlp_analyses else 0

        # Check sources mentioning pain points
        negative_scraped = [d for d in scraped_data if any(
            a.sentiment_label == models.SentimentLabel.negative
            for a in nlp_analyses if a.data_id == d.data_id
        )]

        sources_with_pain = set(d.platform for d in negative_scraped)
        source_count = len(sources_with_pain)

        # Scoring
        if negative_pct >= 60 and source_count >= 4:
            score = 10
            reason = f"Severe pain points: {negative_pct:.0f}% negative across {source_count} platforms"
        elif negative_pct >= 50 and source_count >= 3:
            score = 8
            reason = f"Significant pain points: {negative_pct:.0f}% negative across {source_count} platforms"
        elif negative_pct >= 40 and source_count >= 2:
            score = 6
            reason = f"Moderate pain points: {negative_pct:.0f}% negative"
        elif negative_pct >= 25:
            score = 4
            reason = f"Some pain points: {negative_pct:.0f}% negative"
        else:
            score = 2
            reason = f"Minimal pain: Only {negative_pct:.0f}% negative"

        return {"score": score, "reason": reason}

    # ==================== DIMENSION 8: MONETIZATION POTENTIAL ====================
    def score_monetization_potential(self) -> dict:
        """
        Score based on CPC (cost per click) and market size.
        - High CPC + Large market = profitable
        - CPC shows what competitors pay for attention
        """
        search_vols = self.db.query(models.SearchVolumeData).filter(
            models.SearchVolumeData.campaign_id == self.campaign_id
        ).all()

        if not search_vols:
            return {"score": 4, "reason": "No market data for monetization analysis"}

        # Calculate average CPC and volume
        cpcs = [sv.cpc for sv in search_vols if sv.cpc]
        volumes = [sv.monthly_volume for sv in search_vols if sv.monthly_volume]

        avg_cpc = sum(cpcs) / len(cpcs) if cpcs else 0
        avg_volume = sum(volumes) / len(volumes) if volumes else 0

        # Scoring: High CPC = valuable keywords, Large volume = many paying users
        if avg_cpc >= 5 and avg_volume >= 50000:
            score = 10
            reason = f"Highly profitable: ${avg_cpc:.2f} CPC, {int(avg_volume):,} searches/month"
        elif avg_cpc >= 3 and avg_volume >= 20000:
            score = 8
            reason = f"Good monetization: ${avg_cpc:.2f} CPC, {int(avg_volume):,} searches/month"
        elif avg_cpc >= 2 or avg_volume >= 10000:
            score = 6
            reason = f"Moderate monetization: ${avg_cpc:.2f} CPC, {int(avg_volume):,} searches"
        elif avg_cpc >= 1:
            score = 4
            reason = f"Low monetization: ${avg_cpc:.2f} CPC, {int(avg_volume):,} searches"
        else:
            score = 2
            reason = "Limited monetization potential"

        return {"score": score, "reason": reason}
