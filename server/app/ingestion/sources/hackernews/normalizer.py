"""Hacker News normalization helpers."""

from __future__ import annotations


def _to_int(value, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def normalize_hackernews_hits(
    campaign_id: int,
    keyword_lookup: dict[str, int],
    extracted_rows: list[dict],
) -> list[dict]:
    """Normalize extracted HN hits into ScrapedData-compatible dicts."""
    normalized: list[dict] = []

    for row in extracted_rows:
        keyword = str(row.get("keyword", "")).strip()
        if not keyword:
            continue

        keyword_id = keyword_lookup.get(keyword.lower())
        hit = row.get("hit") or {}

        object_id = str(hit.get("objectID") or "").strip()
        if not object_id:
            continue

        title = str(hit.get("title") or hit.get("story_title") or "").strip()
        body = str(hit.get("story_text") or hit.get("comment_text") or "").strip()

        if title and body:
            content = f"Title: {title}\n\n{body}"
        elif title:
            content = f"Title: {title}"
        elif body:
            content = body
        else:
            continue

        post_url = str(hit.get("url") or "").strip()
        if not post_url:
            post_url = f"https://news.ycombinator.com/item?id={object_id}"

        points = _to_int(hit.get("points"), 0)
        comments = _to_int(hit.get("num_comments"), 0)

        normalized.append(
            {
                "campaign_id": campaign_id,
                "keyword_id": keyword_id,
                "source_post_id": object_id,
                "post_url": post_url,
                "title": title or None,
                "content": content,
                "author": str(hit.get("author") or "unknown"),
                "points": max(points, 0),
                "comments_count": max(comments, 0),
                "engagement_score": max(points, 0) + max(comments, 0),
            }
        )

    return normalized
