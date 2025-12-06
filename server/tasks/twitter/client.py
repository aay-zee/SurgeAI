import os
from functools import lru_cache

import tweepy
from dotenv import load_dotenv

load_dotenv()


class MissingTwitterCredentials(Exception):
    """Raised when required Twitter API credentials are missing."""


def _build_client() -> tweepy.Client:
    bearer_token = os.getenv("TWITTER_BEARER_TOKEN")
    if not bearer_token:
        raise MissingTwitterCredentials("TWITTER_BEARER_TOKEN is not set in the environment")

    return tweepy.Client(bearer_token=bearer_token, wait_on_rate_limit=True)


@lru_cache(maxsize=1)
def get_twitter_client() -> tweepy.Client:
    """Return a cached Tweepy client instance."""
    return _build_client()
