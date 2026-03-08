"""Google Trends API client helpers."""

from typing import Any
import pytrends


def create_google_trends_client(
    hl: str = "en-US",
    tz: int = 360,
    retries: int = 2,
    backoff_factor: float = 0.2,
) -> Any:
    """Create a pytrends client lazily to avoid hard import failure at startup."""
    try:
        from pytrends.request import TrendReq
    except ImportError as exc:
        raise RuntimeError(
            "pytrends is not installed. Install dependencies from requirements.txt"
        ) from exc

    return TrendReq(
        hl=hl,
        tz=tz,
        retries=retries,
        backoff_factor=backoff_factor,
    )
