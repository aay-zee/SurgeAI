from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
import sys
from pathlib import Path

# Load .env from server directory
server_dir = Path(__file__).parent.parent
dotenv_path = server_dir / ".env"
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def run_migrations():
    """Add new columns to existing tables if they don't exist (ALTER TABLE)."""
    migrations = [
        # ScrapedData semantic fields
        "ALTER TABLE scraped_data ADD COLUMN IF NOT EXISTS embedding JSON",
        "ALTER TABLE scraped_data ADD COLUMN IF NOT EXISTS relevance_score FLOAT",
        "ALTER TABLE scraped_data ADD COLUMN IF NOT EXISTS is_relevant BOOLEAN",
        # Campaign semantic fields
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS generated_keywords JSON",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS problem_embedding JSON",
    ]
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            for sql in migrations:
                try:
                    conn.execute(text(sql))
                except Exception as e:
                    # Column might already exist or DB doesn't support IF NOT EXISTS
                    print(f"Migration note: {e}")
        print("[OK] Schema migrations applied")
    except Exception as e:
        print(f"[WARN] Could not run migrations: {e}")