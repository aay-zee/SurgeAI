# SurgeAI — Mid-Evaluation Preparation Guide
> **Team:** Aneeq Zafar, Abdul Haseeb, Muhammad Ayaz | **Advisor:** Razi Uddin | **FAST-NUCES FYP 2026**

---

## Table of Contents
1. [What is SurgeAI?](#1-what-is-surgeai)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Schema (14 Tables)](#4-database-schema-14-tables)
5. [Celery Task Queue — Every Task Explained](#5-celery-task-queue)
6. [The Full Pipeline — Step by Step](#6-the-full-pipeline)
7. [NLP Models — Why These?](#7-nlp-models)
8. [The Demand Score Formula](#8-the-demand-score-formula)
9. [Intelligence Layer (LLM Features)](#9-intelligence-layer)
10. [All API Endpoints](#10-all-api-endpoints)
11. [Frontend Components](#11-frontend-components)
12. [Authentication System](#12-authentication-system)
13. [Demo Flow Script](#13-demo-flow-script)
14. [Evaluator Q&A](#14-evaluator-qa)
15. [What's Done vs What's Planned](#15-whats-done-vs-whats-planned)

---

## 1. What is SurgeAI?

SurgeAI is an **AI-powered startup idea validation platform**. Entrepreneurs enter a business idea (campaign name + description + keywords), and SurgeAI automatically:

1. **Scrapes** real conversations from Reddit and Hacker News
2. **Filters** irrelevant posts using semantic similarity (NLP)
3. **Analyzes** each post for sentiment and intent using HuggingFace transformer models
4. **Scores** the idea with a demand score (0–100)
5. **Generates** deeper insights via an LLM intelligence layer (theme extraction, competitor analysis, 8-dimension validation, full written report)

**Core problem it solves:** Founders waste months building products nobody wants. SurgeAI gives evidence-based validation in minutes, not months. It answers: "Is there real demand for my idea?"

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend API** | FastAPI (Python) |
| **ORM** | SQLAlchemy |
| **Database** | PostgreSQL |
| **Task Queue** | Celery |
| **Message Broker** | Redis |
| **Schema Validation** | Pydantic v2 |
| **Reddit Scraping** | PRAW (Python Reddit API Wrapper) |
| **HackerNews Scraping** | Algolia HN Search API (HTTP) |
| **Google Play Scraping** | `google-play-scraper` Python library |
| **Google Trends** | `pytrends` Python library |
| **Sentiment Model** | HuggingFace: `cardiffnlp/twitter-roberta-base-sentiment-latest` |
| **Intent Model** | HuggingFace: `facebook/bart-large-mnli` (zero-shot NLI) |
| **Relevance Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` |
| **LLM** | HuggingFace Router: `meta-llama/Meta-Llama-3-8B-Instruct` via `HF_API_TOKEN` |
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **UI Components** | shadcn/ui + Tailwind CSS |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **HTTP Client** | Axios |
| **Auth** | JWT (access token in memory + refresh token in httpOnly cookie) |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────┐
│                  Frontend (Next.js 15)           │
│  App Router │ shadcn/ui │ Recharts │ Tailwind    │
└───────────────────────┬─────────────────────────┘
                        │ HTTP (REST) + JWT
                        ▼
┌─────────────────────────────────────────────────┐
│              FastAPI Backend                    │
│  Endpoints │ Auth middleware │ Pydantic schemas  │
│  SQLAlchemy ORM │ PostgreSQL                    │
└──────────────┬──────────────────────────────────┘
               │ .apply_async() / .si()
               ▼
┌─────────────────────────────────────────────────┐
│              Redis (Message Broker)             │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│           Celery Worker Process                 │
│                                                 │
│  Task 1: reddit_scraper   ─┐                   │
│  Task 2: hackernews_scraper─┤ group (parallel)  │
│                             ▼                   │
│  Task 3: relevance_filter  (marks irrelevant)  │
│                             ▼                   │
│  Task 4: nlp_analysis      (sentiment+intent)  │
│                             ▼                   │
│  Task 5: validation_engine (demand score)      │
│                                                 │
│  Task 6: google_play_scraper  (on-demand only) │
│  Task 7: google_trends_scraper (on-demand only)│
└─────────────────────────────────────────────────┘
```

**Key design principles:**
- Scraping is **async** — the API returns immediately (HTTP 201), tasks run in background
- Celery **canvas** is used: `group()` for parallel, pipe `|` for sequential
- `.si()` (immutable signature) means each task ignores the return value of the previous task and receives only `campaign_id`
- Celery worker auto-discovers tasks via the `include` list in `celery_worker.py`

---

## 4. Database Schema (14 Tables)

### Core Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| user_id | PK Integer | |
| email | String UNIQUE | Login identifier |
| password_hash | String | bcrypt hash |
| full_name | String | |
| role | Enum | `admin` or `client` |
| is_active | Boolean | default True |
| last_login | DateTime | updated on login |
| reset_token | String | nullable, for pwd reset |
| reset_token_expires_at | DateTime | |

#### `campaigns`
| Column | Type | Notes |
|--------|------|-------|
| campaign_id | PK Integer | |
| name | String | the idea name |
| description | Text | what the idea does |
| keywords | Text | stored as comma-separated text |
| platforms | ARRAY(String) | e.g. `["reddit","hacker_news"]` |
| status | Enum | `pending/scraping/completed/failed/active/paused` |
| created_at | DateTime | |
| user_id | FK → users | owner |

#### `keywords`
| Column | Type | Notes |
|--------|------|-------|
| keyword_id | PK Integer | |
| campaign_id | FK → campaigns | |
| keyword | String | single keyword |

#### `scraped_data` — **central data table**
| Column | Type | Notes |
|--------|------|-------|
| data_id | PK Integer | |
| campaign_id | FK → campaigns | |
| keyword_id | FK → keywords | which keyword found this |
| platform | Enum | `reddit / hacker_news / google_play` |
| post_id | String UNIQUE | deduplication key |
| post_url | String | link to original post |
| content | Text | the actual post text |
| author | String | |
| engagement_score | Integer | upvotes/points |
| is_relevant | Boolean | **default True**; set False by relevance filter |
| relevance_score | Float | cosine similarity (0–1) from embeddings |
| embedding | JSON | vector stored for potential future use |

#### `nlp_analysis` — **one row per scraped_data row**
| Column | Type | Notes |
|--------|------|-------|
| analysis_id | PK Integer | |
| data_id | FK → scraped_data UNIQUE | 1:1 relationship |
| sentiment_score | Float | -1.0 to 1.0 (CHECK constraint) |
| sentiment_label | Enum | `positive / negative / neutral` |
| topics | JSON | `{"top_words": ["tool","workflow","..."]}` |
| keywords_extracted | JSON | currently null |
| intent | String(50) | one of 5 BART labels |
| analyzed_at | DateTime | |

#### `validation_results` — **demand score output**
| Column | Type | Notes |
|--------|------|-------|
| validation_id | PK Integer | |
| campaign_id | FK → campaigns | new row per run |
| demand_score | Float | 0–100 (CHECK constraint) |
| sentiment_aggregate | Float | -1 to 1 mean score |
| positive_mentions | Integer | count |
| negative_mentions | Integer | count |
| neutral_mentions | Integer | count |
| summary | Text | human-readable verdict |
| generated_at | DateTime | |

#### `generated_comments`
| Column | Type | Notes |
|--------|------|-------|
| comment_id | PK Integer | |
| campaign_id | FK → campaigns | |
| data_id | FK → scraped_data | post to comment on |
| generated_comment | Text | LLM-generated reply |
| status | Enum | `draft/approved/posted/rejected` |
| target_platform | String | |
| target_post_id | String | |
| posted_at | DateTime | nullable |

#### `keyword_activities`
Tracks per-keyword, per-platform post and engagement counts. Unique constraint on `(keyword_id, platform)`.

### Intelligence Layer Tables

#### `hackernews_data`
Dedicated table for HN posts. Columns: `hn_data_id`, `campaign_id`, `keyword_id`, `source_post_id`, `post_url`, `title`, `content`, `author`, `points`, `comments_count`, `engagement_score`. Unique on `(campaign_id, source_post_id)`.

#### `google_play_data`
Competitor app reviews. Columns: `gp_data_id`, `campaign_id`, `app_id`, `app_name`, `developer`, `app_rating`, `review_id`, `review_content`, `review_rating`, `reviewer_name`, `thumbs_up`, `engagement_score`. Unique on `(campaign_id, review_id)`.

#### `google_trends_points`
| Column | Type | Notes |
|--------|------|-------|
| trend_id | PK Integer | |
| campaign_id | FK | |
| keyword_id | FK | |
| region | String | default "GLOBAL" |
| trend_date | DateTime | one per week/month |
| interest | Integer | Google's 0–100 interest scale |
| is_partial | Boolean | whether the week is incomplete |

Unique on `(campaign_id, keyword_id, region, trend_date)`.

#### `search_volume_data`
Placeholder for future SerpAPI / keyword volume data. Has columns for `monthly_volume`, `cpc`, `competition`. Currently **not populated** — market size and monetization potential scores in the rule-based scorer default to mid-range because of this.

#### `validation_scores`
The 8-dimension intelligence layer output. Columns: `market_size`, `demand`, `problem_clarity`, `competitor_gap`, `technical_feasibility`, `market_growth`, `pain_point_severity`, `monetization_potential`, `overall_score`, plus one `_reason` text column per dimension.

#### `llm_analyses`
Stores LLM outputs in JSON. Columns: `themes` (JSON dict), `competitor_analysis` (JSON dict), `report_text` (Text). One row per campaign, updated on re-run.

---

## 5. Celery Task Queue

### Configuration (`server/tasks/celery_worker.py`)

```python
celery_app = Celery(
    "surgeai",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",
    include=[
        'tasks.reddit_scraper',
        'tasks.hackernews_scraper',
        'tasks.google_play_scraper',
        'tasks.google_trends_scraper',
        'tasks.relevance_filter_task',
        'tasks.nlp_analysis',
        'tasks.validation_engine',
    ]
)
```

- **Broker** = Redis. FastAPI pushes task messages to Redis; Celery worker picks them up.
- **Backend** = Redis. Stores task state (PENDING/SUCCESS/FAILURE) and return values.
- **`include`** tells Celery where to auto-discover tasks on startup.

### Task 1: `tasks.reddit_scraper.scrape_reddit_for_campaign`

**Purpose:** Collect Reddit posts related to the campaign keywords.

**How it works:**
1. Loads the campaign from DB, gets all keywords
2. Builds search query: `"keyword1" OR "keyword2" OR "keyword3"`
3. Uses PRAW (Python Reddit API Wrapper) to search subreddits: `startups+SideProject+smallbusiness+Entrepreneur`
4. Fetches up to **100 posts** per keyword (previously 10 — fixed to get better volume scores)
5. For **self posts** (text posts): saves `"Title: {title}\n\n{body}"`
6. For **link posts** (URLs): saves `"Title: {title}"` — previously these were skipped entirely (bug, now fixed)
7. Deduplicates by `post_id` — skips posts already in DB
8. Saves to `scraped_data` table with `platform=REDDIT`
9. Updates `keyword_activities` with post count

**Key design decisions:**
- Searches across 4 entrepreneurship subreddits, not all of Reddit, to get relevant startup discussion
- Sort by "new" to get recent discussions
- Includes link posts because Reddit link posts still have meaningful titles

**What could go wrong:** Reddit API rate limits (429), PRAW auth failure if `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET` env vars are missing.

---

### Task 2: `tasks.hackernews_scraper.scrape_hackernews_for_campaign`

**Purpose:** Collect Hacker News posts related to campaign keywords.

**How it works:**
1. Uses the **Algolia HN Search API** (`http://hn.algolia.com/api/v1/search`) — no auth required
2. Searches for each keyword as a query
3. Fetches stories, comments, Ask HNs, Show HNs
4. Saves to **two places**:
   - `hackernews_data` table (native HN fields: points, comment count)
   - `scraped_data` table (platform=HACKER_NEWS) — so NLP pipeline processes HN posts too
5. Deduplicates by `(campaign_id, source_post_id)` in hackernews_data and by `post_id` in scraped_data
6. Updates `keyword_activities`

**Why Algolia?** HN doesn't have an official full-text search API. Algolia is the official HN search backend (used at hn.algolia.com).

---

### Task 3: `tasks.relevance_filter_task.run_relevance_filter`

**Purpose:** Mark off-topic posts as `is_relevant=False` so NLP doesn't waste compute on them.

**How it works:**
1. Calls `app.relevance_filter.filter_relevant_data(campaign_id, db)`
2. That function:
   a. Builds a "problem statement" from campaign name + description + keywords
   b. Embeds the problem statement using `sentence-transformers/all-MiniLM-L6-v2` (384-dim vectors)
   c. Embeds each post's content
   d. Computes **cosine similarity** between each post and the problem statement
   e. If similarity >= 0.25 → `is_relevant=True`, `relevance_score=X`
   f. If similarity < 0.25 → `is_relevant=False`, `relevance_score=X`
3. Returns stats: `{"relevant": 47, "total": 60}`

**Threshold rationale:** 0.25 cosine similarity is a practical threshold for topical relevance. Confirmed working: relevant posts score ~0.65, genuinely irrelevant posts score ~0.07.

**Safety design:** Posts default to `is_relevant=True`. If the relevance filter crashes, all posts remain relevant and NLP still runs on everything. The task catches exceptions and returns a non-fatal message.

**Why MiniLM?** It's the fastest sentence-transformer model (22M params vs 340M for larger models) and accurate enough for cosine similarity matching. Runs in ~0.1s per post on CPU.

---

### Task 4: `tasks.nlp_analysis.run_sentiment_for_campaign`

**Purpose:** Run 3 analyses on every relevant, unanalyzed post: sentiment, intent, topics.

**How it works:**
1. Fetches all posts where `is_relevant=True` AND no `nlp_analysis` row exists yet (via `crud.get_unanalysed_scraped_data_for_campaign`)
2. **Step 1 — Sentiment (batch):**
   - Model: `cardiffnlp/twitter-roberta-base-sentiment-latest`
   - Runs ALL posts in a single batch call (fast GPU/CPU inference)
   - Truncates to 512 tokens
   - Output labels: `LABEL_0`=negative, `LABEL_1`=neutral, `LABEL_2`=positive
   - Maps to human labels and converts confidence score to [-1, 1] range
3. **Step 2 — Intent (per-post):**
   - Model: `facebook/bart-large-mnli` (zero-shot NLI classifier)
   - 5 candidate labels: `"buying intent"`, `"pain point"`, `"feature request"`, `"positive feedback"`, `"general discussion"`
   - Truncates post to first 1024 chars (prevents timeout on long posts)
   - `multi_label=False` — picks the single best label
   - If intent pipeline fails to load, intent is saved as `None` (non-fatal)
4. **Step 3 — Topics (in-process, no model):**
   - Simple word frequency with stopword filtering
   - Returns top 5 words: `{"top_words": ["tool","automation","workflow","email","outreach"]}`
5. Saves one `NLPAnalysis` row per post

**Lazy loading:** Both HuggingFace models are initialized only on first call within the worker process. This means the first task run in a fresh worker is slow (~30s to download/load models); subsequent runs are fast.

---

### Task 5: `tasks.validation_engine.compute_validation_score`

**Purpose:** Aggregate all NLP results into a single Demand Score for the campaign.

**How it works:**
1. Joins `NLPAnalysis` + `ScrapedData` for the campaign
2. Counts positive/negative/neutral posts
3. Computes sentiment aggregate (mean of all scores, -1 to 1)
4. Computes **demand score** (see Section 8)
5. Identifies top intent (most common intent label across posts)
6. Generates a human-readable summary string with verdict
7. Saves a new `ValidationResult` row
8. Sets campaign status to `COMPLETED` (or `FAILED` on exception)

**Verdict thresholds:**
- >= 70 → "Strong demand signal — Consider building an MVP"
- >= 40 → "Moderate demand signal — Gather more data"
- < 40 → "Weak demand signal — Consider pivoting"

---

### Task 6: `tasks.google_play_scraper.scrape_google_play_for_campaign`

**Purpose:** Find competitor apps and analyze user reviews to gauge market saturation.

**When it runs:** On-demand only (triggered by the intelligence layer). Does NOT run in the main pipeline.

**How it works:**
1. For each campaign keyword, searches Google Play for matching apps
2. Takes top 5 apps per keyword
3. Fetches up to 50 reviews per app
4. Saves to `google_play_data` table AND `scraped_data` (platform=GOOGLE_PLAY)
5. Review data includes: `review_content`, `review_rating` (1–5), `reviewer_name`, `thumbs_up`

**Why this is useful:** App store reviews are the most raw, unfiltered user feedback about what competitors are doing wrong — directly tells you market gaps.

---

### Task 7: `tasks.google_trends_scraper.scrape_google_trends_for_campaign`

**Purpose:** Fetch 12-month search interest data to determine if the market is growing or declining.

**When it runs:** On-demand only (triggered by the intelligence layer). Does NOT run in the main pipeline.

**How it works:**
1. Uses `pytrends` library (unofficial Google Trends API client)
2. Fetches weekly interest-over-time for each keyword (past 12 months)
3. Interest is Google's 0–100 relative scale (100 = peak interest)
4. Saves each weekly data point as a `GoogleTrendsPoint` row
5. Unique constraint prevents duplicate date entries

**How trend direction is derived** (in `/market-signals` endpoint):
- If >=10 data points: compares most recent value to mean of first 10 (baseline). If recent > 1.1x baseline → rising; < 0.9x → falling; else stable
- If 2–9 data points: simple first vs last comparison

---

## 6. The Full Pipeline

### Campaign Creation (triggered automatically)

```
User submits campaign form
        │
        ▼
POST /campaigns
  └─ Creates campaign row (status=PENDING)
  └─ Creates keyword rows
  └─ Calls .apply_async() on the Celery canvas:

group(
  scrape_reddit_for_campaign.si(campaign_id),    ─┐
  scrape_hackernews_for_campaign.si(campaign_id)  ─┤ Both run in PARALLEL
)                                                ─┘
  |                                          Celery group waits for both
  ▼
run_relevance_filter.si(campaign_id)
  Sets is_relevant=True/False on each post
  |
  ▼
run_sentiment_for_campaign.si(campaign_id)
  Only processes is_relevant=True posts
  Adds NLPAnalysis rows (sentiment + intent + topics)
  |
  ▼
compute_validation_score.si(campaign_id)
  Aggregates NLP results → demand_score
  Sets campaign status = COMPLETED
```

**Important:** FastAPI returns HTTP 201 immediately after queueing. The tasks run asynchronously in the Celery worker. The frontend polls `GET /campaigns/{id}` until status = COMPLETED, then fetches results.

### Re-analysis (triggered manually from UI)

```
POST /campaigns/{id}/analyze
  └─ chain(
       run_sentiment_for_campaign.si(id),
       compute_validation_score.si(id)
     ).apply_async()
```

This skips scraping — only re-processes unanalyzed posts (useful after adding keywords or when wanting fresh scores).

### Intelligence Layer (each step is independent, triggered from UI)

```
POST /campaigns/{id}/calculate-validation  → Rule-based 8D scorer
POST /campaigns/{id}/llm-validation        → LLM 8D scorer
POST /campaigns/{id}/extract-themes        → LLM theme extraction
POST /campaigns/{id}/extract-competitor-themes → GP scrape + LLM analysis
POST /campaigns/{id}/calculate-confidence  → Data quality confidence score
POST /campaigns/{id}/generate-llm-report   → Full written validation report
```

---

## 7. NLP Models

### Model 1: `cardiffnlp/twitter-roberta-base-sentiment-latest`

**Architecture:** RoBERTa-base (125M params) fine-tuned on 124M tweets
**Task:** 3-class sentiment classification
**Why chosen:**
- Trained on social media text — perfect fit for Reddit/HN discussions
- Outperforms general BERT on informal text, slang, abbreviations
- 3 classes (positive/neutral/negative) vs binary sentiment — better granularity
- Fast inference (RoBERTa-base, not large)

**Output mapping:**
```
LABEL_0 → negative
LABEL_1 → neutral
LABEL_2 → positive
```

**Score mapping to [-1, 1]:**
- Positive with confidence 0.9 → `0.9 × 2 - 1 = 0.8`
- Negative with confidence 0.9 → `-(0.9 × 2 - 1) = -0.8`
- Neutral → always 0.0

### Model 2: `facebook/bart-large-mnli`

**Architecture:** BART-large (400M params) fine-tuned on MultiNLI
**Task:** Zero-shot text classification via Natural Language Inference
**Why chosen:**
- Zero-shot means we don't need labeled training data for our 5 intent categories
- Works by framing intent detection as entailment: "Does this text entail the hypothesis: the user has buying intent?"
- BART-large-mnli is the industry standard for zero-shot NLI classification
- 5 intent labels: `buying intent | pain point | feature request | positive feedback | general discussion`

**Why these 5 intents:**
- `buying intent` → user is ready to pay → monetization signal
- `pain point` → user has an unsolved problem → opportunity signal
- `feature request` → user wants something specific → product direction signal
- `positive feedback` → validation that something works → market exists signal
- `general discussion` → background noise

**How NLI works:** The model takes (text, candidate_label) and outputs a probability for entailment. The label with highest entailment probability wins.

### Model 3: `sentence-transformers/all-MiniLM-L6-v2`

**Architecture:** MiniLM-L6 (22M params) fine-tuned on sentence pairs
**Task:** Semantic sentence embeddings
**Why chosen:**
- Fastest sentence-transformer model while maintaining good semantic accuracy
- Produces 384-dimensional vectors
- Cosine similarity between vectors = semantic similarity

**How it's used:** Problem statement → embedding. Each post → embedding. Cosine similarity >= 0.25 → relevant.

---

## 8. The Demand Score Formula

### Why the old formula was wrong

The original formula only counted **positive sentiment** as demand:
```
demand_pct = (positive_count / total) * 100
```

This is fundamentally flawed because:
- A post saying "I can't find any tool that handles X" is **negative sentiment** but is the strongest possible demand signal
- A post complaining "All existing solutions are terrible" = pain point = demand
- Using sentiment alone penalizes the most valuable posts

### The corrected formula

```python
DEMAND_INTENTS = {"buying intent", "pain point", "feature request"}

demand_signals = sum(
    1 for r in rows
    if sentiment_label == "positive"
    or (intent is not None and intent.lower() in DEMAND_INTENTS)
)

demand_pct = (demand_signals / total) * 100

# Volume score — discussion volume as a proxy for market size
# Capped at 50 posts = 100% volume score
volume_score = (min(total, 50) / 50) * 100

# Final weighted formula
demand_score = round((demand_pct * 0.6) + (volume_score * 0.4), 1)
```

**Why 60/40 split?**
- Quality signal (demand_pct) weighted more than quantity (volume_score)
- But volume matters — nobody discussing = no market, regardless of how positive the few posts are
- 50 posts cap prevents gaming by flooding with irrelevant posts

### Worked Example

Campaign: "AI Sales Development Representative" — keywords: AI SDR, cold email automation, sales automation

- 85 posts scraped total
- After relevance filter: 60 relevant
- After NLP:
  - 25 positive sentiment posts
  - 18 pain point intents ("no tool handles X"), 8 buying intent ("looking for a solution"), 5 feature requests
  - Some overlap (a post can be both positive AND pain point — counted once)
- demand_signals = ~45 posts (positive OR pain_point/buying_intent/feature_request)
- demand_pct = (45/60) × 100 = 75%
- volume_score = (min(60,50)/50) × 100 = 100%
- demand_score = (75 × 0.6) + (100 × 0.4) = 45 + 40 = **85.0 → Strong demand signal**

---

## 9. Intelligence Layer

The intelligence layer runs **on-demand** (user clicks buttons in the UI). It uses:
- The scraped data already in the DB
- An LLM (`meta-llama/Meta-Llama-3-8B-Instruct` via HuggingFace Router)

### Rule-Based 8-Dimension Scorer (`POST /calculate-validation`)

Scores 8 dimensions, each 0–10:

| Dimension | Data Source | Logic |
|-----------|-------------|-------|
| **market_size** | `search_volume_data` | Requires SerpAPI data (not populated → returns mid score) |
| **demand** | `validation_results.demand_score` | Maps demand_score (0–100) to 0–10 scale |
| **problem_clarity** | `nlp_analysis.topics` | How consistent are the topics across posts? |
| **competitor_gap** | `google_play_data` | % of low-rated GP reviews (gaps in market) |
| **technical_feasibility** | Campaign description keywords | Detects if idea uses "simple" vs "complex" tech |
| **market_growth** | `google_trends_points` | Rising/stable/falling trend direction |
| **pain_point_severity** | `nlp_analysis.intent` + sentiment | % pain point + buying intent intents |
| **monetization_potential** | `search_volume_data.cpc` | CPC as willingness-to-pay proxy (not populated → mid) |

Overall score = weighted average of all 8 dimensions.

### LLM Validation (`POST /llm-validation`)

Same 8 dimensions but scored by the LLM with free-text reasoning. Sends scraped post samples + campaign description to Llama 3 8B. Returns scores + explanations.

### Theme Extraction (`POST /extract-themes`)

LLM analyzes negative/pain-point posts and groups them into recurring complaint themes. Returns dict of theme → {frequency, severity, quotes, description}.

**Example output:**
```json
{
  "Poor CRM Integration": {
    "frequency": 12,
    "severity": "high",
    "quotes": ["Our CRM doesn't sync with any email tool", "..."],
    "description": "Users consistently report that email tools don't integrate with their existing CRM"
  }
}
```

### Competitor Analysis (`POST /extract-competitor-themes`)

1. LLM identifies real competitor apps for the idea (e.g. "Outreach.io", "Apollo.io", "Salesloft")
2. Google Play scraper fetches reviews for each competitor app
3. LLM analyzes reviews → strengths, weaknesses, gaps per competitor

### Confidence Score (`POST /calculate-confidence`)

Assesses how much to trust the validation results based on data quality:
- Volume factor: enough posts scraped?
- Sentiment diversity: enough varied opinions?
- Has trends data?
- Has competitor data?
- Returns 0–100% confidence + list of warnings

### LLM Report (`POST /generate-llm-report`)

Generates a full written startup validation report (~500–1000 words) covering:
- Market opportunity assessment
- Customer pain points analysis
- Competitive landscape
- Feasibility and risks
- Recommendation (build/pivot/research more)

---

## 10. All API Endpoints

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user, returns JWT pair |
| POST | `/auth/login` | Login, returns JWT pair |
| POST | `/auth/refresh` | Refresh access token using refresh token |
| POST | `/auth/logout` | Stateless logout (client discards token) |
| GET | `/auth/me` | Get current user info |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/change-password` | Change password (authenticated) |

### Campaigns

| Method | Path | Description |
|--------|------|-------------|
| GET | `/campaigns` | List all campaigns for current user |
| POST | `/campaigns` | Create campaign + trigger scraping pipeline |
| GET | `/campaigns/{id}` | Get campaign details + status |
| PUT | `/campaigns/{id}` | Update campaign name/description/keywords |
| DELETE | `/campaigns/{id}` | Delete campaign and all related data (cascade) |

### Campaign Data

| Method | Path | Description |
|--------|------|-------------|
| GET | `/campaigns/{id}/posts` | Posts with nested NLP analysis (limit 200) |
| GET | `/campaigns/{id}/scraped-data` | Raw scraped data (filterable by platform) |
| GET | `/campaigns/{id}/sentiment-summary` | Counts + percentages by sentiment label |
| GET | `/campaigns/{id}/validation-result` | Latest demand score + summary |
| POST | `/campaigns/{id}/analyze` | Re-trigger NLP + validation (skip scraping) |
| GET | `/campaigns/{id}/market-signals` | Discussion volume, trend, intent, competitor saturation |
| GET | `/campaigns/{id}/hackernews-data` | HN posts for this campaign |
| GET | `/campaigns/{id}/google-play-data` | GP reviews for this campaign |

### Keywords

| Method | Path | Description |
|--------|------|-------------|
| GET | `/campaigns/{id}/keywords` | List all keywords |
| POST | `/campaigns/{id}/keywords` | Add keywords (bulk) |
| DELETE | `/campaigns/{id}/keywords/{kid}` | Remove a keyword |
| GET | `/campaigns/{id}/keywords/stats` | Activity stats per keyword |
| GET | `/campaigns/{id}/keywords/ranking` | Keywords ranked by post count |
| GET | `/campaigns/{id}/keywords/ranking/{platform}` | Rankings filtered by platform |

### Intelligence Layer

| Method | Path | Description |
|--------|------|-------------|
| POST | `/campaigns/{id}/calculate-validation` | Rule-based 8D scoring → saves to DB |
| GET | `/campaigns/{id}/validation-score` | Get stored 8D scores |
| POST | `/campaigns/{id}/llm-validation` | LLM 8D scoring with reasoning |
| POST | `/campaigns/{id}/extract-themes` | Extract complaint themes via LLM |
| POST | `/campaigns/{id}/extract-competitor-themes` | Fetch GP data + analyze competitors |
| POST | `/campaigns/{id}/calculate-confidence` | Data quality confidence score |
| POST | `/campaigns/{id}/generate-llm-report` | Full written validation report |

---

## 11. Frontend Components

### Pages (Next.js 15 App Router)

```
/                           → Landing page
/auth/login                 → Login
/auth/register              → Signup
/client/dashboard           → Main dashboard (campaigns list)
/client/campaigns/[id]/results → Campaign results (full analysis view)
```

### Key Components

**`CampaignsContent.tsx`** — Dashboard campaigns list:
- Fetches campaigns from API on load
- Shows status badges (pending/scraping/completed/failed)
- "New Campaign" button opens modal
- Each campaign row navigates to results page

**`results/page.tsx`** — The main results view:
- Polls `GET /campaigns/{id}` until status = COMPLETED
- Shows processing banner while scraping ("Collecting data from all platforms...")
- 6 tabs: Overview, Sentiment, Posts, Market Signals, Intelligence, Report
- Auto-fetches market signals on load
- Handles all intelligence layer button actions

**Tab Components:**

**`MarketSignalsTab.tsx`:**
- 4 metric cards: Discussion Volume, Trend Direction, Buying Intent %, Competitor Saturation
- Color-coded by value (green=good, amber=moderate, red=bad)
- "Refresh" button re-fetches from `/market-signals`
- "Overall Assessment" section with bullet-point interpretation

**`SentimentChart.tsx`:**
- Recharts PieChart showing sentiment distribution
- Colors: emerald-500 (positive), amber-400 (neutral), red-500 (negative)

**`ScrapedDataTable.tsx`:**
- Table of all scraped posts with NLP results
- Platform filter buttons: All | Reddit | Hacker News | Google Play
- Shows: content, platform badge, sentiment badge, intent, engagement score

**`SentimentDistribution.tsx`** (widget):
- Progress bars for each sentiment label
- Same colors as chart for consistency

**Service Layer (`campaign.service.ts`):**
All API calls go through this service. Uses Axios with JWT interceptors (auto-refresh on 401).

---

## 12. Authentication System

### JWT Architecture

- **Access token:** Short-lived (default 30 min). Stored in JS memory (not localStorage — prevents XSS theft). Sent as `Authorization: Bearer <token>` header.
- **Refresh token:** Long-lived (7 days). Stored in httpOnly cookie (JS cannot read it — prevents XSS theft). Used to get new access tokens.

### Flow

```
1. User logs in → POST /auth/login
2. Server returns: access_token (in JSON body) + refresh_token (httpOnly cookie)
3. Client stores access_token in memory
4. Every request: adds Authorization: Bearer <access_token>
5. Axios interceptor: if 401 received → POST /auth/refresh → get new access_token → retry original request
6. If refresh also fails → redirect to login
```

### JWT Payload

```json
{
  "sub": "user@email.com",
  "role": "client",
  "exp": 1740000000,
  "type": "access"
}
```

Role is embedded in the token → backend can authorize admin vs client without DB lookup.

### Password Reset

1. `POST /auth/forgot-password` with email
2. Backend generates a reset token, stores hash + expiry in `users.reset_token`
3. Sends email with link (via SMTP email service)
4. User clicks link → `POST /auth/reset-password` with token + new password
5. Backend verifies token hasn't expired, updates password_hash, clears reset_token

---

## 13. Demo Flow Script

### Pre-demo setup
```bash
# Terminal 1 — Start backend
cd server && source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Start Celery worker
cd server && source venv/bin/activate
celery -A tasks.celery_worker worker --loglevel=info

# Terminal 3 — Start Redis (if not running)
redis-server

# Terminal 4 — Start frontend
cd client && npm run dev
```

### Demo Script

**Step 1: Show the landing page and register**
- "This is SurgeAI — we help founders validate startup ideas using real social media data"
- Register a new account, explain JWT auth

**Step 2: Create a campaign**
- Campaign name: "AI Email Outreach Tool for B2B Sales"
- Description: "An AI-powered tool that automates cold email personalization and follow-up sequences for B2B sales teams"
- Keywords: `AI SDR, cold email automation, sales automation, email personalization, B2B outreach`
- Platforms: Reddit + Hacker News
- Submit → show HTTP 201 response, campaign status = PENDING

**Step 3: Watch the pipeline run (Celery worker terminal)**
- Show: "Scraping Reddit for campaign X" and "Scraping HackerNews for campaign X" appearing together (parallel execution)
- Show: "Relevance filtering done: 52/68 posts relevant"
- Show: "Analysis completed for campaign X: 52 posts"
- Show: "Validation complete: demand_score=81.3"

**Step 4: Show results**
- **Overview tab:** Demand score gauge showing 81.3 (Strong demand signal)
- **Sentiment tab:** Pie chart — e.g. 48% positive, 31% neutral, 21% negative
- **Posts tab:** Show filtered posts, use platform filter to show only Reddit vs HN
  - Click on a post with "pain point" intent and show the NLP analysis
- **Market Signals tab:** Show 4 cards (discussion volume, trend, buying intent %, competitor saturation)
- **Intelligence tab:** Click "Calculate Scores" → 8D radar chart appears
  - Explain each dimension
- **Report tab:** Click "Generate LLM Report" → full written analysis

**Step 5: Explain the architecture (if asked)**
- "Reddit and HN scrapers run in parallel via Celery group()"
- "Then relevance filter marks off-topic posts using semantic embeddings"
- "Then HuggingFace RoBERTa classifies sentiment, BART classifies intent"
- "Finally validation engine aggregates into the demand score"

---

## 14. Evaluator Q&A

### "What is the core innovation of your project?"
> Traditional market research relies on surveys (biased) or expensive consultants. SurgeAI mines organic, unsolicited discussions where real users express genuine pain and buying intent. The NLP pipeline extracts structured insight (sentiment, intent, themes) from unstructured social data automatically. The key innovation is treating pain-point posts as demand signals — not just positive sentiment.

### "Why did you choose FastAPI over Django/Flask?"
> FastAPI gives async support out of the box (important for I/O-bound API calls), automatic OpenAPI docs generation, Pydantic integration for request/response validation, and is significantly faster than Flask. Django was overkill for a pure API backend with no server-side rendering.

### "Why Celery and Redis? Why not just run tasks in a thread?"
> Threads share memory with the web server process — a long-running NLP task (loading 400MB BART model) would block the API for all users. Celery isolates tasks in a separate process. Redis provides a persistent message queue so tasks survive server restarts. Celery also provides retry logic, rate limiting, and result storage for free.

### "How does the Celery canvas work?"
> `group(task1, task2)` runs tasks in parallel — both scrapers start simultaneously. The `|` pipe operator creates a chain — the next task only starts when the group completes. `.si()` (immutable signature) means each task only receives `campaign_id` as argument, not the return value of the previous task. This is safe because tasks communicate via the database, not return values.

### "Why RoBERTa and not BERT or GPT?"
> RoBERTa was specifically fine-tuned on 124M tweets and social media posts — our data (Reddit/HN) is informal, uses slang, abbreviations, and informal grammar, exactly what RoBERTa was optimized for. BERT was trained on formal text (Wikipedia, BooksCorpus). GPT would be too slow for batch sentiment on 50–100 posts and would require prompt engineering.

### "What is zero-shot classification? Why use it for intent?"
> Zero-shot classification uses Natural Language Inference: "Does this text entail the hypothesis that the user has buying intent?" We don't need labeled training data for our specific intent categories. BART-large-mnli was fine-tuned on MultiNLI (392K premise-hypothesis pairs) and can generalize to any entailment task. The alternative would be collecting thousands of labeled examples for our 5 intents — which we didn't have.

### "What is cosine similarity? How does relevance filtering work?"
> Cosine similarity measures the angle between two vectors. Sentence embeddings encode semantic meaning as a 384-dimensional vector — semantically similar sentences will have vectors pointing in similar directions (cosine similarity close to 1). We embed the campaign description and compare it to each post. Similarity < 0.25 means the post is likely off-topic (e.g., someone in r/startups discussing fundraising when we're researching email tools).

### "Why is the demand score formula weighted 60/40?"
> Pure sentiment-based scoring (only counting positive posts) ignores the most valuable data: pain points are negative sentiment but strong demand signals. The 60% demand percentage accounts for both positive sentiment AND active needs (pain points, buying intent, feature requests). The 40% volume score ensures we're not overconfident from just 5 positive posts — market size matters too. The 50-post cap prevents gaming.

### "What's the difference between validation_results and validation_scores tables?"
> `validation_results` is the core demand score from the automated NLP pipeline (runs every time a campaign is created). It has one number: 0–100 demand score. `validation_scores` is the 8-dimension intelligence layer score (user triggers manually), which requires more data (trends data, GP data) and produces a richer analysis across 8 market dimensions.

### "How do you prevent one user from accessing another user's campaigns?"
> Every endpoint uses `Depends(get_current_active_user)` middleware. The JWT is verified and decoded to get the user's email. Then `crud.get_campaign(db, campaign_id, user_id=current_user.user_id)` adds `WHERE user_id = X` to every campaign query. If the campaign doesn't belong to the user, it returns None → HTTP 404 (we don't reveal that the campaign exists at all).

### "What happens if the Celery worker crashes mid-pipeline?"
> Tasks at the PENDING/STARTED state will remain in Redis. Celery can be configured with `acks_late=True` so tasks are only acknowledged after completion — if the worker crashes, Redis re-queues the task for the next worker. Currently, the campaign would remain in `scraping` status until the user manually re-triggers analysis via the Analyze button. In production, we'd add task monitoring (Flower) and auto-retry logic.

### "Why store embeddings in JSON column rather than using a vector database?"
> For the current scale (hundreds of posts per campaign), JSON column is sufficient and avoids adding another infrastructure dependency. A vector database (Pinecone, pgvector) would be the production choice when scaling to thousands of campaigns and needing cross-campaign similarity search.

### "What's the project completion %?"
> Core pipeline (scraping → NLP → scoring): **100% complete**. Intelligence layer (LLM features): **85% complete** (working, but LLM report quality depends on HF API availability). Frontend UI: **90% complete** (all tabs working, minor polishing). Deployment/DevOps: **70% complete** (Docker configs ready, Render/Vercel configs added). Comment generation feature (in model but UI not yet wired): **20%**. Overall: **~80% complete**.

---

## 15. What's Done vs What's Planned

### Done
- [x] JWT auth (register, login, refresh, password reset)
- [x] Campaign CRUD with keyword management
- [x] Reddit scraping via PRAW (100 posts, all post types)
- [x] HackerNews scraping via Algolia API
- [x] Semantic relevance filtering (MiniLM-L6-v2 embeddings)
- [x] Sentiment analysis (RoBERTa-base, 3-class)
- [x] Intent classification (BART-large-mnli, zero-shot, 5 labels)
- [x] Topic extraction (word frequency)
- [x] Demand score formula (60/40 weighted, pain points as demand signals)
- [x] Celery canvas pipeline (group → chain)
- [x] Google Trends scraper (pytrends)
- [x] Google Play scraper (competitor reviews)
- [x] Rule-based 8D validation scorer
- [x] LLM validation scoring (Llama 3 8B)
- [x] LLM theme extraction
- [x] LLM competitor analysis
- [x] Data quality confidence scorer
- [x] LLM report generation
- [x] Market Signals tab (real data: volume, trends, intent %, competitor saturation)
- [x] Platform filter on posts table
- [x] Sentiment chart with consistent colors
- [x] Docker configuration
- [x] Render + Vercel deployment configs

### Planned for Final Evaluation
- [ ] Comment generation UI (backend model exists, needs frontend wiring)
- [ ] Bulk comment workflow (approve/reject/post)
- [ ] Search volume data via SerpAPI (would improve market_size and monetization scores)
- [ ] Email notification when campaign analysis completes
- [ ] Campaign comparison view (side-by-side two ideas)
- [ ] Trend chart visualization (plot GoogleTrendsPoints over time)
- [ ] Admin dashboard (user management, campaign overview)
- [ ] Production deployment (Render backend + Vercel frontend)

---

*Document generated: March 2026 | SurgeAI FYP — FAST-NUCES*
