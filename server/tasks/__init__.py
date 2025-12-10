# This makes sure the celery app is created before tasks are imported
from tasks.celery_worker import celery_app
from tasks.reddit_scraper import scrape_reddit_for_campaign

__all__ = ['celery_app', 'scrape_reddit_for_campaign']
