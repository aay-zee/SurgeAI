"""Google Trends normalization helpers."""

from typing import Any

GLOBAL_REGION_ALIASES = {"", "GLOBAL", "WORLD", "ALL"}


def normalize_interest_over_time_rows(
    campaign_id: int,
    keyword_lookup: dict[str, int],
    extracted_rows: list[dict[str, Any]],
    region: str | None = None,
) -> list[dict]:
    region_value = (region or "GLOBAL").upper()
    if region_value in GLOBAL_REGION_ALIASES:
        region_value = "GLOBAL"

    normalized: list[dict] = []

    for item in extracted_rows:
        keyword = str(item.get("keyword", "")).strip()
        if not keyword:
            continue

        keyword_id = keyword_lookup.get(keyword.lower())
        if not keyword_id:
            continue

        for point in item.get("points", []):
            trend_date = point.get("date")
            if not trend_date:
                continue

            try:
                interest = max(0, min(100, int(point.get("interest", 0))))
            except (TypeError, ValueError):
                interest = 0

            normalized.append({
                "campaign_id": campaign_id,
                "keyword_id": keyword_id,
                "region": region_value,
                "trend_date": trend_date,
                "interest": interest,
                "is_partial": bool(point.get("is_partial", False)),
            })

    return normalized
