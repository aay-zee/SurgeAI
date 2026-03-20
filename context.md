# SurgeAI — Project Context

## What is SurgeAI?

SurgeAI is a **startup/idea validation platform** built as a Final Year Project (FYP). It validates business ideas by collecting real market evidence from multiple online platforms, analyzing sentiment, scoring validation dimensions, extracting pain points, identifying competitors, and generating comprehensive reports with confidence assessments.

A user creates a "campaign" with a product name, description, and keywords. The system then scrapes data from 6 platforms, runs NLP sentiment analysis, and produces an 8-dimension validation score with an overall confidence rating.

---

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Server**: Uvicorn
- **Database**: PostgreSQL + SQLAlchemy ORM
- **Task Queue**: Celery + Redis (Upstash) for async scraping
- **NLP**: Meta Llama 3 8B Instruct via HuggingFace Router (free tier)
- **Auth**: JWT (python-jose) + bcrypt (passlib)

### Frontend
- **Framework**: Next.js (React 19, TypeScript)
- **UI**: Radix UI components + Tailwind CSS
- **Charts**: Recharts
- **HTTP**: Axios with JWT interceptors
- **Forms**: React Hook Form + Zod
- **Animations**: Motion library
- **Dark Mode**: next-themes

---

## Data Sources & Scrapers (6 active platforms)

| # | Platform | Method | What it Collects |
|---|----------|--------|------------------|
| 1 | **Reddit** | PRAW API | Posts from startup/tech subreddits, comments, upvotes, engagement |
| 2 | **Hacker News** | Algolia API (free) | Stories, points, comments matching keywords |
| 3 | **Product Hunt** | Web scraping | Products, upvotes, comments, taglines, maker info |
| 4 | **Google Play** | google-play-scraper lib | App reviews, ratings, developer info, thumbs up |
| 5 | **Quora** | SerpAPI (site:quora.com Google search) | Questions, descriptions, URLs |
| 6 | **Google Trends** | pytrends | 12-month interest over time, regional data |

### Additional Data (no scraping, API-based)
| # | Source | Method | What it Provides |
|---|--------|--------|------------------|
| 7 | **Search Volume** | SerpAPI Google search | Monthly volume proxy (from total_results), competition, CPC estimate, trend direction |

### Removed
- **Stack Exchange** — cut off, all references removed from backend + frontend

### How Each Scraper Works
- Each scraper is a Celery task (can also run synchronously via `/campaigns/{id}/run-scrapers`)
- Writes to **two tables**: a platform-specific table (e.g. `reddit_data`) AND the normalized `scraped_data` table
- Links data to campaign keywords via `keyword_id`
- Updates `keyword_activities` with per-keyword engagement metrics
- Rate limiting built into each scraper (sleep between requests)

### Data Flow
```
User creates campaign → Celery tasks triggered per platform →
Each scraper: fetch → store in platform table + scraped_data →
NLP sentiment analysis chains after scraping →
User triggers: validation scores, themes, competitors, confidence →
GET /report returns everything
```

---

## Database Schema (12 active tables)

### Core
- **users** — email, password_hash, role (ADMIN/CLIENT), is_active, reset tokens
- **campaigns** — name, description, keywords_text, platforms (array), status, user_id
- **keywords** — keyword text, linked to campaign

### Platform-Specific Data
- **reddit_data** — source_post_id, title, content, author, score, comments_count
- **hackernews_data** — source_post_id, title, content, author, points, comments_count
- **product_hunt_data** — source_product_id, product_name, tagline, description, upvotes
- **quora_data** — source_post_id, question_title, question_url, description, upvotes, answer_count
- **google_play_data** — app_id, app_name, review_id, review_content, review_rating, thumbs_up
- **search_volume_data** — keyword, monthly_volume, competition, competition_index, cpc, trend_direction
- **google_trends_points** — keyword_id, region, trend_date, interest (0-100)

### Normalized + Analysis
- **scraped_data** — unified table for all platforms (platform enum, post_id, content, engagement_score)
- **nlp_analysis** — sentiment_score (-1.0 to 1.0), sentiment_label (positive/negative/neutral), topics, keywords_extracted
- **keyword_activities** — per-keyword per-platform engagement tracking (post_count, engagement_count)
- **validation_scores** — 8 dimension scores (1-10) + reasons + overall_score
- **generated_comments** — AI-generated comments for outreach (draft/approved/posted)
- **validation_results** — legacy demand_score, sentiment_aggregate

---

## NLP Analysis Pipeline

### Sentiment Analysis
- **Model**: `meta-llama/Meta-Llama-3-8B-Instruct` via HuggingFace Router
- **Endpoint**: `https://router.huggingface.co/v1/chat/completions` (OpenAI-compatible)
- **Auth**: `HF_API_TOKEN` env var
- **Method**: Sends each post (truncated to 400 chars) with system prompt asking for one-word classification
- **Output**: positive/negative/neutral label + confidence score mapped to [-1.0, 1.0]
- **Rate limit**: 1 req/sec (HF free tier)
- **Runs on**: all rows in `scraped_data` that don't have an `nlp_analysis` entry yet

### Theme Extraction (rule-based, in `theme_extractor.py`)
Extracts from negative sentiment data, groups into categories:
- performance, cost, user_interface, learning_curve, integration, features, bugs, customer_support
- Returns: frequency, sentiment score, source platforms, representative quotes

### Competitor Analysis (rule-based, in `theme_extractor.py`)
- Analyzes Google Play reviews to find competitor apps
- Extracts strengths (high-rated reviews) and weaknesses (low-rated reviews)
- Returns competitor list with rating, developer info, review count

---

## Validation Scoring (8 dimensions, 1-10 scale)

Calculated in `validation_scorer.py` — all rule-based using collected data:

| Dimension | Data Source | Logic |
|-----------|------------|-------|
| Market Size | SearchVolumeData | Monthly search volume ranges |
| Demand | ScrapedData + NLPAnalysis | Positive sentiment % + total mentions |
| Problem Clarity | (was Stack Exchange, now returns neutral 4) | — |
| Competitor Gap | GooglePlayData | % of negative reviews in competitor apps |
| Technical Feasibility | (was Stack Exchange, now returns neutral 5) | — |
| Market Growth | GoogleTrendsPoints | Comparing recent vs older trend data |
| Pain Point Severity | NLPAnalysis | % of negative sentiment posts |
| Monetization Potential | SearchVolumeData | CPC + search volume combination |

**Overall Score** = average of all 8 dimensions (persisted to `validation_scores` table)

---

## Confidence Scoring (0-100%, in `confidence_scorer.py`)

5 factors averaged:

1. **Data Volume** — total data points across all platforms (0-500+ scale)
2. **Data Diversity** — how many of 6 platforms have data
3. **Analysis Coverage** — % of scraped data with NLP analysis
4. **Data Freshness** — days since most recent scrape
5. **Threshold Compliance** — checks minimum data requirements per dimension

---

## API Endpoints

### Auth
- `POST /auth/register` — signup (returns JWT)
- `POST /auth/login` — login (returns access + refresh tokens)
- `POST /auth/refresh` — refresh access token
- `POST /auth/logout` — client-side token discard
- `GET /auth/me` — current user info
- `POST /auth/forgot-password` — request password reset
- `POST /auth/reset-password` — reset with token
- `POST /auth/change-password` — change password (authenticated)

### Campaigns
- `GET /campaigns` — list user's campaigns
- `POST /campaigns` — create campaign + trigger scrapers (Celery)
- `GET /campaigns/{id}` — get campaign details
- `PUT /campaigns/{id}` — update campaign
- `DELETE /campaigns/{id}` — delete campaign
- `POST /campaigns/{id}/run-scrapers` — run all scrapers synchronously (no Celery needed)

### Platform Data
- `GET /campaigns/{id}/scraped-data` — normalized data (filterable by keyword/platform)
- `GET /campaigns/{id}/reddit-data`
- `GET /campaigns/{id}/hackernews-data`
- `GET /campaigns/{id}/product-hunt-data`
- `GET /campaigns/{id}/quora-data`
- `GET /campaigns/{id}/google-play-data`
- `GET /campaigns/{id}/search-volume-data`
- `GET /campaigns/{id}/google-trends`

### Analysis & Scoring
- `POST /campaigns/{id}/calculate-validation` — calculate + persist 8-dimension scores
- `GET /campaigns/{id}/validation-score` — retrieve stored scores
- `POST /campaigns/{id}/extract-themes` — extract pain point themes
- `POST /campaigns/{id}/extract-competitor-themes` — competitor analysis
- `POST /campaigns/{id}/calculate-confidence` — data quality assessment

### Dashboard Data
- `GET /campaigns/{id}/posts` — posts with nested NLP analysis
- `GET /campaigns/{id}/sentiment-summary` — sentiment counts + percentages
- `GET /campaigns/{id}/analytics` — time series, traffic sources, devices
- `GET /campaigns/{id}/social-feedback` — scraped data with sentiment (filterable)
- `GET /campaigns/{id}/generated-comments` — AI-generated comments
- `GET /campaigns/{id}/report` — comprehensive report (everything in one call)

### Keywords
- `POST /campaigns/{id}/keywords` — add keywords
- `GET /campaigns/{id}/keywords` — list keywords
- `DELETE /campaigns/{id}/keywords/{kid}` — delete keyword
- `GET /campaigns/{id}/keywords/stats` — keyword engagement stats
- `GET /campaigns/{id}/keywords/{kid}/activity` — keyword activity per platform
- `GET /campaigns/{id}/keywords/{kid}/activity/{platform}` — specific platform activity
- `GET /campaigns/{id}/keywords/ranking` — ranked keywords by engagement
- `GET /campaigns/{id}/keywords/ranking/{platform}` — ranked by specific platform

### LLM Report
- `POST /campaigns/{id}/generate-llm-report` — generate AI report via Mistral 7B / Llama 3 (HuggingFace)

---

## Environment Variables (server/.env)

```
# Database
DATABASE_URL=postgresql://user:password@host:5432/surgeai_db

# Redis (Upstash — uses rediss:// for TLS)
REDIS_URL=rediss://default:<password>@<endpoint>.upstash.io:6379

# JWT Auth
SECRET_KEY=your-secret-key

# Reddit (PRAW)
PRAW_CLIENT_ID=...
PRAW_CLIENT_SECRET=...
PRAW_USER_AGENT=SurgeAI/1.0

# SerpAPI (for Quora search + Search Volume)
SERPAPI_KEY=...

# HuggingFace (for NLP sentiment analysis)
HF_API_TOKEN=hf_...
```

---

## Project Structure

```
SurgeAI/
├── server/
│   ├── app/
│   │   ├── main.py              # FastAPI app, all endpoints
│   │   ├── models.py            # SQLAlchemy models (12 tables)
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── crud.py              # Database CRUD operations
│   │   ├── database.py          # PostgreSQL connection + SessionLocal
│   │   ├── auth.py              # JWT + password hashing
│   │   ├── validation_scorer.py # 8-dimension validation scoring
│   │   ├── theme_extractor.py   # Theme + competitor extraction
│   │   ├── confidence_scorer.py # 5-factor confidence scoring
│   │   ├── llm_report.py        # LLM report generation
│   │   └── ingestion/sources/google_trends/client.py
│   ├── tasks/
│   │   ├── celery_worker.py     # Celery + Redis config
│   │   ├── reddit_scraper.py
│   │   ├── hackernews_scraper.py
│   │   ├── product_hunt_scraper.py
│   │   ├── google_play_scraper.py
│   │   ├── quora_scraper.py     # Uses SerpAPI (site:quora.com)
│   │   ├── search_volume_scraper.py  # Uses SerpAPI Google search
│   │   ├── google_trends_scraper.py  # Uses pytrends
│   │   └── nlp_analysis.py      # Llama 3 8B via HuggingFace Router
│   ├── requirements.txt
│   └── run.py
├── client/
│   ├── app/
│   │   ├── (public)/            # Landing, login, signup pages
│   │   └── client/              # Protected dashboard routes
│   │       ├── campaigns/[campaign_id]/results/page.tsx
│   │       ├── analytics/page.tsx
│   │       ├── keywords/page.tsx
│   │       ├── comments/page.tsx
│   │       └── settings/page.tsx
│   ├── components/
│   │   ├── dashboard/           # Dashboard container + tab components
│   │   ├── cards/               # ValidationScoreCard, ThemeCard etc.
│   │   ├── tables/              # RawDataTable
│   │   ├── widgets/             # ConfidenceWidget
│   │   └── ui/                  # WarningBanner, basic Radix components
│   ├── services/
│   │   ├── auth.service.ts
│   │   └── campaign.service.ts
│   ├── types/campaign.ts
│   └── lib/axios.ts
├── context.md                   # This file
└── README.md
```

---

## Running the Project

### Backend
```bash
cd server
source venv/Scripts/activate     # Windows Git Bash
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd client
npm install
npm run dev    # runs on http://localhost:3000
```

### Celery Worker (optional — needed for async scraping)
```bash
cd server
celery -A tasks.celery_worker worker --loglevel=info
```
On Windows without Celery, use `POST /campaigns/{id}/run-scrapers` endpoint instead.

---

## Current Working State (March 2026)

### Backend — Fully Operational
- All 6 scrapers working (Reddit, HN, Product Hunt, Google Play, Quora, Search Volume + Google Trends)
- NLP sentiment analysis working (Llama 3 8B via HuggingFace)
- Validation scoring (8 dimensions) calculating and persisting to DB
- Theme extraction + competitor analysis working
- Confidence scoring working
- All API endpoints functional
- JWT auth complete

### Frontend — Partially Implemented
- Auth pages (login, signup, forgot password) complete
- Campaign list + creation form complete
- Basic dashboard layout exists
- Dashboard tabs (ValidationScores, Themes, Confidence, RawData, etc.) exist but need data wiring
- Service layer has API methods for most endpoints

### Known Issues
- Problem Clarity and Technical Feasibility scores return neutral (4/10 and 5/10) since Stack Exchange was removed — could be re-wired to use other data sources
- HuggingFace free tier has quota limits — NLP analysis may get 402 errors on large campaigns
- Quora scraper gets question titles/URLs but not upvote/answer counts (limitation of Google search results)
- Google Play `search()` return type varies by library version — handled with isinstance check
