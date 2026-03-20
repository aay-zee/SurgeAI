"""Google Trends API client helpers."""

from typing import Any

# Monkey-patch urllib3 Retry to fix pytrends compatibility with urllib3 v2
# (urllib3 v2 renamed 'method_whitelist' → 'allowed_methods')
import urllib3.util.retry
_OrigRetry = urllib3.util.retry.Retry
_orig_init = _OrigRetry.__init__

def _patched_init(self, *args, **kwargs):
    if "method_whitelist" in kwargs:
        kwargs["allowed_methods"] = kwargs.pop("method_whitelist")
    _orig_init(self, *args, **kwargs)

urllib3.util.retry.Retry.__init__ = _patched_init


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
        timeout=(10, 30),
    )
