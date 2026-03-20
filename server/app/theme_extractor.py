"""
Theme Extractor: Groups similar complaints/feedback by topic and extracts representative quotes.
Uses keyword-based clustering to identify themes and selects best quotes per theme.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from . import models
from collections import defaultdict
import re


class ThemeExtractor:
    """Extracts themes from feedback and returns representative quotes."""

    def __init__(self, campaign_id: int, db: Session):
        self.campaign_id = campaign_id
        self.db = db
        self.campaign = db.query(models.Campaign).filter(
            models.Campaign.campaign_id == campaign_id
        ).first()

        # Common complaint themes to look for
        self.theme_keywords = {
            "performance": [
                "slow", "lag", "delay", "speed", "fast", "loading", "sluggish",
                "freezes", "timeout", "performance", "responsive"
            ],
            "user_interface": [
                "ui", "interface", "ux", "design", "confusing", "intuitive",
                "layout", "navigation", "button", "icon", "dark mode", "theme"
            ],
            "learning_curve": [
                "learn", "steep", "curve", "tutorial", "onboarding", "guide",
                "documentation", "complex", "complicated", "difficult", "hard to use",
                "unintuitive"
            ],
            "integration": [
                "integrate", "integration", "api", "sync", "plugin", "addon",
                "export", "import", "compatible", "slack", "email", "webhook"
            ],
            "cost": [
                "price", "cost", "expensive", "cheap", "affordable", "fee",
                "subscription", "pricing", "plan", "free", "paid"
            ],
            "features": [
                "feature", "missing", "lack", "need", "want", "support",
                "ability", "cant do", "doesn't have", "no way to"
            ],
            "bugs": [
                "bug", "crash", "error", "broken", "fix", "issue", "problem",
                "glitch", "doesn't work", "failed", "exception"
            ],
            "customer_support": [
                "support", "help", "customer service", "response", "slow response",
                "unresponsive", "no help", "ignore", "email support"
            ],
        }

    def extract_themes(self) -> dict:
        """
        Extract themes from sentiment-analyzed data.
        Returns: {
            "theme_name": {
                "frequency": 45,
                "sentiment": -0.75,
                "sources": ["google_play", "reddit"],
                "quotes": ["quote1", "quote2", "quote3"]
            }
        }
        """
        if not self.campaign:
            return {}

        # Get all scraped data with sentiment analysis
        scraped_data = self.db.query(models.ScrapedData).filter(
            models.ScrapedData.campaign_id == self.campaign_id
        ).all()

        if not scraped_data:
            return {}

        # Get NLP analysis for all scraped data
        nlp_analyses = self.db.query(models.NLPAnalysis).filter(
            models.NLPAnalysis.data_id.in_([d.data_id for d in scraped_data])
        ).all()

        if not nlp_analyses:
            return {}

        # Create mapping: data_id -> NLP analysis
        nlp_map = {a.data_id: a for a in nlp_analyses}

        # Group data by theme
        theme_data = defaultdict(lambda: {"items": [], "sentiment_scores": [], "sources": set()})

        for data in scraped_data:
            nlp = nlp_map.get(data.data_id)
            if not nlp or nlp.sentiment_label != models.SentimentLabel.negative:
                continue  # Only focus on negative feedback

            content = (data.content or "").lower()

            # Check which themes this content matches
            matched_themes = []
            for theme_name, keywords in self.theme_keywords.items():
                if any(keyword in content for keyword in keywords):
                    matched_themes.append(theme_name)

            # If no specific theme matched, try to extract generic theme
            if not matched_themes:
                matched_themes = self._extract_generic_theme(content)

            # Add to each matched theme
            for theme in matched_themes:
                theme_data[theme]["items"].append({
                    "content": data.content,
                    "sentiment_score": nlp.sentiment_score or 0,
                    "platform": data.platform,
                })
                theme_data[theme]["sentiment_scores"].append(nlp.sentiment_score or 0)
                theme_data[theme]["sources"].add(data.platform)

        # Process themes to extract representative quotes
        result = {}
        for theme_name, data in theme_data.items():
            if not data["items"]:
                continue

            # Get representative quotes (longest, most negative)
            quotes = self._select_best_quotes(data["items"], count=5)

            # Calculate average sentiment
            avg_sentiment = (
                sum(data["sentiment_scores"]) / len(data["sentiment_scores"])
                if data["sentiment_scores"]
                else 0
            )

            result[theme_name] = {
                "frequency": len(data["items"]),
                "sentiment": round(avg_sentiment, 2),
                "sources": sorted(list(data["sources"])),
                "quotes": quotes,
            }

        return result

    def _extract_generic_theme(self, content: str) -> list:
        """Extract theme from content if no keyword match. Returns list of generic themes."""
        # Simple heuristic: if very negative sentiment, might be a rare issue
        themes = []

        # Check for question/answer pattern (from Stack Exchange)
        if "question" in content or "answer" in content or "?" in content:
            themes.append("technical_questions")

        # Check for review-like content
        if any(word in content for word in ["terrible", "awful", "horrible", "worst"]):
            themes.append("general_satisfaction")

        return themes if themes else ["other_issues"]

    def _select_best_quotes(self, items: list, count: int = 5) -> list:
        """
        Select best representative quotes from items.
        Prioritizes:
        1. Longest quotes (most detailed feedback)
        2. Most negative sentiment
        3. Diversity
        """
        if not items:
            return []

        # Sort by length (longer = more detailed) and sentiment (more negative)
        sorted_items = sorted(
            items,
            key=lambda x: (
                len(x["content"]) if x["content"] else 0,
                x["sentiment_score"]  # More negative = lower score
            ),
            reverse=True
        )

        # Select top quotes, removing duplicates and near-duplicates
        selected = []
        for item in sorted_items:
            if not item["content"]:
                continue

            # Skip if too similar to already selected
            is_duplicate = any(
                self._similarity(item["content"], selected_quote) > 0.7
                for selected_quote in selected
            )

            if not is_duplicate:
                selected.append(item["content"])

                if len(selected) >= count:
                    break

        return selected[:count]

    def _similarity(self, text1: str, text2: str) -> float:
        """Calculate simple similarity between two texts (0-1)."""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())

        if not words1 or not words2:
            return 0

        intersection = len(words1 & words2)
        union = len(words1 | words2)

        return intersection / union if union > 0 else 0


class CompetitorThemeExtractor:
    """Extract competitor-specific themes from Google Play reviews."""

    def __init__(self, campaign_id: int, db: Session):
        self.campaign_id = campaign_id
        self.db = db

    def extract_competitor_themes(self) -> dict:
        """
        Extract themes from Google Play reviews grouped by competitor app.
        Returns: {
            "app_name": {
                "developer": "...",
                "rating": 4.2,
                "themes": {
                    "performance": {
                        "frequency": 45,
                        "quotes": [...]
                    }
                }
            }
        }
        """
        # Get Google Play data
        gplay_data = self.db.query(models.GooglePlayData).filter(
            models.GooglePlayData.campaign_id == self.campaign_id
        ).all()

        if not gplay_data:
            return {}

        # Group by app
        apps = defaultdict(lambda: {"reviews": [], "rating": 0, "developer": ""})

        for review in gplay_data:
            apps[review.app_name]["reviews"].append({
                "content": review.review_content,
                "rating": review.review_rating or 3,
            })
            apps[review.app_name]["rating"] = review.app_rating or 0
            apps[review.app_name]["developer"] = review.developer or "Unknown"

        # Extract themes for each app
        result = {}
        for app_name, app_data in apps.items():
            if not app_data["reviews"]:
                continue

            # Group reviews by rating: negative (1-2), neutral (3), positive (4-5)
            negative_reviews = [r for r in app_data["reviews"] if r["rating"] <= 2]
            positive_reviews = [r for r in app_data["reviews"] if r["rating"] >= 4]

            # Extract themes from negative reviews
            negative_themes = self._extract_themes_from_reviews(
                [r["content"] for r in negative_reviews if r["content"]]
            )

            # Extract themes from positive reviews
            positive_themes = self._extract_themes_from_reviews(
                [r["content"] for r in positive_reviews if r["content"]],
                negative=False
            )

            result[app_name] = {
                "developer": app_data["developer"],
                "rating": app_data["rating"],
                "review_count": len(app_data["reviews"]),
                "weaknesses": negative_themes,
                "strengths": positive_themes,
            }

        return result

    def _extract_themes_from_reviews(self, reviews: list, negative: bool = True) -> dict:
        """Extract themes from a list of review texts."""
        if not reviews:
            return {}

        # Theme extractor
        theme_keywords = {
            "performance": ["slow", "lag", "speed", "fast", "loading", "timeout"],
            "ui_ux": ["ui", "interface", "design", "confusing", "intuitive", "layout"],
            "features": ["feature", "missing", "support", "lack", "need"],
            "cost": ["price", "expensive", "afford", "subscription", "cheap"],
            "bugs": ["bug", "crash", "error", "broken", "glitch"],
            "support": ["support", "help", "customer service", "response"],
        }

        themes = defaultdict(lambda: {"count": 0, "quotes": []})

        for review in reviews:
            review_lower = review.lower()

            for theme, keywords in theme_keywords.items():
                if any(kw in review_lower for kw in keywords):
                    themes[theme]["count"] += 1
                    if len(themes[theme]["quotes"]) < 3:
                        themes[theme]["quotes"].append(review[:200] + "..." if len(review) > 200 else review)

        # Format output
        result = {}
        for theme, data in sorted(themes.items(), key=lambda x: x[1]["count"], reverse=True):
            if data["count"] >= 2:  # Only include themes mentioned 2+ times
                result[theme] = {
                    "frequency": data["count"],
                    "quotes": data["quotes"],
                }

        return result
