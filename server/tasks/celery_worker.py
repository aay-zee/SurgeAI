from celery import Celery
import os
import ssl
from dotenv import load_dotenv

load_dotenv()

# Upstash Redis URL — must use rediss:// (TLS) from Upstash dashboard
# Format: rediss://default:<password>@<endpoint>.upstash.io:6379
REDIS_URL = os.getenv("REDIS_URL", "")

if not REDIS_URL:
    print("WARNING: REDIS_URL is not set. Celery tasks (scrapers) will not run.")
    print("Add REDIS_URL=rediss://default:<password>@<endpoint>.upstash.io:6379 to server/.env")
    REDIS_URL = "memory://"  # dummy broker so imports don't crash

# Detect whether TLS is needed (Upstash uses rediss://)
_use_ssl = REDIS_URL.startswith("rediss://")
_ssl_opts = {"ssl_cert_reqs": ssl.CERT_NONE} if _use_ssl else {}

# Initialize Celery
celery_app = Celery(
    "tasks",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "tasks.reddit_scraper",
        "tasks.hackernews_scraper",
        "tasks.product_hunt_scraper",
        "tasks.quora_scraper",
        "tasks.google_play_scraper",
        "tasks.search_volume_scraper",
        "tasks.nlp_analysis",
        "tasks.google_trends_scraper",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    # SSL settings for Upstash (ignored if not using rediss://)
    broker_use_ssl=_ssl_opts if _use_ssl else None,
    redis_backend_use_ssl=_ssl_opts if _use_ssl else None,
)