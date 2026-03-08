"""Hacker News (Algolia) client helpers."""

from __future__ import annotations

import json
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen


HN_ALGOLIA_BASE_URL = "https://hn.algolia.com/api/v1/search"


def search_hn_by_keyword(
    keyword: str,
    tags: str = "story",
    hits_per_page: int = 20,
    timeout: int = 15,
    max_retries: int = 3,
) -> list[dict]:
    """Search Hacker News content for a keyword using Algolia's public API."""
    params = {
        "query": keyword,
        "tags": tags,
        "hitsPerPage": max(1, min(hits_per_page, 100)),
    }
    url = f"{HN_ALGOLIA_BASE_URL}?{urlencode(params)}"

    for attempt in range(1, max_retries + 1):
        try:
            request = Request(url, headers={"User-Agent": "SurgeAI/1.0"})
            with urlopen(request, timeout=timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
                hits = payload.get("hits", [])
                return hits if isinstance(hits, list) else []
        except Exception as exc:
            if attempt == max_retries:
                print(f"Hacker News search failed for '{keyword}': {exc}")
                return []
            time.sleep(min(2 ** attempt, 8))

    return []
