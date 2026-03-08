"""Hacker News extraction logic."""

from __future__ import annotations

from .client import search_hn_by_keyword


def extract_hackernews_posts(
    keywords: list[str],
    hits_per_keyword: int = 20,
) -> list[dict]:
    """Extract Hacker News story posts for each keyword."""
    extracted: list[dict] = []

    for keyword in keywords:
        clean_keyword = keyword.strip()
        if not clean_keyword:
            continue

        hits = search_hn_by_keyword(
            keyword=clean_keyword,
            tags="story",
            hits_per_page=hits_per_keyword,
        )

        for hit in hits:
            extracted.append({
                "keyword": clean_keyword,
                "hit": hit,
            })

    return extracted
