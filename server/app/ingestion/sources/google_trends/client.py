"""Google Trends API client helpers."""

from typing import Any

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
    try:
        from pytrends.request import TrendReq
    except ImportError as exc:
        raise RuntimeError(
            "pytrends is not installed. Install dependencies from requirements.txt"
        ) from exc

    return TrendReq(hl=hl, tz=tz, retries=retries, backoff_factor=backoff_factor, timeout=(10, 30))
