"""Google Trends extraction logic."""

from typing import Any

GLOBAL_REGION_ALIASES = {"", "GLOBAL", "WORLD", "ALL"}


def fetch_interest_over_time(
    trends_client: Any,
    keywords: list[str],
    region: str | None = None,
    timeframe: str = "today 12-m",
) -> list[dict]:
    geo = (region or "").upper()
    if geo in GLOBAL_REGION_ALIASES:
        geo = ""

    rows: list[dict] = []

    for keyword in keywords:
        clean_keyword = keyword.strip()
        if not clean_keyword:
            continue

        try:
            trends_client.build_payload(kw_list=[clean_keyword], timeframe=timeframe, geo=geo, gprop="")
            df = trends_client.interest_over_time()
        except Exception as exc:
            print(f"Google Trends extraction error for keyword '{clean_keyword}': {exc}")
            rows.append({"keyword": clean_keyword, "points": []})
            continue

        points: list[dict] = []
        if df is not None and not getattr(df, "empty", True):
            for idx, point in df.iterrows():
                value = point.get(clean_keyword)
                try:
                    interest = int(value) if value is not None else 0
                except (TypeError, ValueError):
                    interest = 0
                interest = max(0, min(100, interest))
                trend_date = idx.to_pydatetime() if hasattr(idx, "to_pydatetime") else idx
                points.append({"date": trend_date, "interest": interest, "is_partial": bool(point.get("isPartial", False))})

        rows.append({"keyword": clean_keyword, "points": points})

    return rows
