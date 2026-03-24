# SurgeAI — Mid-Evaluation Prep Guide

---

## What Is SurgeAI

SurgeAI is a startup idea validation platform. A founder enters keywords for their product idea — SurgeAI scrapes Reddit for real organic discussions about those keywords, runs NLP models to understand sentiment and buying intent, and produces a demand score from 0 to 100. The goal is to answer: is there genuine demand on the internet for this idea before you spend 6 months building it?

**Key insight:** Reddit is a goldmine of authentic, unfiltered opinions. Unlike surveys or interviews, Reddit users are not trying to please anyone — they complain openly, ask for solutions publicly, and express buying intent without knowing a product exists yet.

---

## What Is DONE

### FYP-1 (completed before this semester)

- Full JWT auth: register, login, logout, refresh token, password reset, change password
- Campaign CRUD with user ownership (users only see their own campaigns)
- Reddit scraping pipeline: PRAW → Celery background task → deduplication, exponential backoff on rate limits
- Basic NLP sentiment analysis as a Celery task (distilbert model)
- Database schema — all tables designed upfront including `validation_results` and `generated_comments`
- Campaign results page showing real scraped data (sentiment chart + posts table + stats)
- Campaign list page + create campaign modal
- Full auth flows: login, signup, forgot password, landing page

### FYP-2 (completed in the days before mid-evaluation)

#### Backend

- **NLP upgrade**: swapped to `cardiffnlp/twitter-roberta-base-sentiment-latest` — true 3-class output (positive / neutral / negative). Trained on 124 million tweets — much better fit for Reddit's informal language than the old movie-review-trained DistilBERT.
- **Fixed label mapping**: new model outputs `LABEL_0/1/2` not plain strings. Updated `_map_label()` to handle this correctly — without this fix, everything would have silently mapped to "neutral".
- **Intent detection**: added `facebook/bart-large-mnli` zero-shot classification. Classifies each Reddit post into one of 5 intents: buying intent / pain point / feature request / positive feedback / general discussion. No training data required — uses Natural Language Inference.
- **Topic extraction**: word frequency extraction (words ≥4 chars, stopwords removed, top 5 per post). Populates the `topics` JSON column which was always NULL before.
- **Validation Engine** (`tasks/validation_engine.py`): Celery task that aggregates all NLP results for a campaign and computes:
  - `demand_score` (0–100): `(positive_pct × 0.6) + (volume_score × 0.4)`
  - `sentiment_aggregate` (-1 to 1): average sentiment score
  - `summary`: auto-generated human-readable string
  - Writes to `ValidationResult` table (existed but was always empty before)
- **Extended Celery chain**: scrape → NLP → validation score (3-task automatic pipeline)
- **New endpoints**:
  - `GET /campaigns/{id}/validation-result` — fetch the latest validation result
  - `POST /campaigns/{id}/analyze` — re-run NLP + validation without re-scraping Reddit

#### Frontend

- **TypeScript types**: added `intent`, `topics` to `NLPAnalysis` interface; added `ValidationResult` interface
- **Service layer**: added `getValidationResult()` and `triggerAnalysis()` to `campaign.service.ts`
- **Campaign results page** (full rewrite):
  - Yellow processing banner while campaign is still running
  - Auto-polls every 5 seconds until complete — no manual refresh needed
  - `ValidationScoreCard`: color-coded 0–100 score (green ≥70, yellow ≥40, red <40) + summary text
  - Intent breakdown: percentage bars for each intent label, computed from per-post data
  - Posts table: added "Intent" column with badge per post
- **Dashboard widgets** (all connected to real data, hardcoded mock values removed):
  - `SentimentDistribution`: real pie chart from API, responds to campaign selection
  - `TrendingKeywords`: real word cloud from `topics.top_words` across all campaign posts
  - `AIMarketingSuggestion`: 3 insight cards driven by real demand score + intent data
  - `DashboardContent` stats cards: real posts count, real positive %, real demand score (removed fake "2.4M engagement / 340% ROI / 96.7% accuracy")
  - `EngagementHeatmap`: made deterministic (no more random flickering), labelled "(illustrative)" — honest about what it shows
- **Insights page** (full rewrite — was showing revenue/conversion charts that had nothing to do with SurgeAI):
  - Idea Validation Score card
  - Sentiment breakdown bar chart (Recharts, real counts)
  - User Intent breakdown (animated progress bars)
  - Top Discussed Topics (word cloud)
- **Sidebar + navigation fixes**:
  - "Create a Campaign" → "Campaigns"
  - "Analytics" → "Insights"
  - Removed "Keywords" page (was showing SEO CPC data — completely wrong for SurgeAI)
  - Fixed "How it works" text: removed references to Twitter/Quora (Reddit only)

---

## What Is LEFT (after mid-evaluation)

The remaining work is one cohesive feature: **the action layer**. Once a founder knows their idea has demand, SurgeAI helps them act on it.

### 1. AI Comment / Response Generation

The `generated_comments` table already exists in the DB with a `status` field: `DRAFT / APPROVED / POSTED / REJECTED`.

What needs to be built:
- After a campaign completes, generate AI-suggested Reddit comments/responses based on the campaign's insights
- Example: "48% of posts are pain points — generate a comment that addresses this frustration"
- The generation can use an LLM API or a rule-based template approach

### 2. Comment Review Workflow (frontend)

- A review queue page (`/comments` route already exists as a placeholder)
- User sees generated comments with DRAFT status
- Can approve or reject each suggestion before anything is posted
- This ensures no content goes out without human oversight (important for Reddit ToS compliance)

### 3. Optional: Posting to Reddit

- Post approved comments to Reddit using the existing PRAW integration
- Must be framed as user-controlled action, not automated spam
- Can be a stretch goal if time is tight

### Smaller items (optional / stretch)

- Multi-platform expansion (Twitter/Quora) — dropped for FYP-2, could be added later
- Production deployment — Docker + Vercel/Render configs already committed, just needs to go live
- Campaign comparison — compare two campaigns side by side
- Trend over time — re-run validation periodically and plot score over time

---

## What Remains Before Mid-Evaluation

Nothing critical is missing. The core pipeline is complete and working end-to-end:

```
Create campaign → Reddit scraping → NLP (sentiment + intent + topics) → Validation score → Dashboard + Insights
```

**Before the demo, do this checklist:**

1. Restart Celery worker (picks up `tasks.validation_engine`)
2. Restart FastAPI server (picks up new endpoints)
3. Pre-cache the models by running one test campaign (BART = ~1.6 GB + cardiffnlp = ~500 MB, downloads once and caches)
4. Pre-create a demo campaign the night before with real data so you don't wait during the evaluation
5. Verify the dashboard: select that pre-run campaign and confirm all widgets show real numbers

---

## Demo Flow for Evaluators

### Step 1 — Show Auth
Login with a pre-created account. Mention: "Full JWT auth with refresh token rotation — access token lives in memory, refresh token in an httpOnly cookie."

### Step 2 — Show Campaigns Page
"This is the main workspace. A user creates a campaign by entering their product idea and keywords. SurgeAI does the rest automatically."

### Step 3 — Show a Pre-Run Campaign (do NOT create live during demo — too slow)
Point to the status flow: PENDING → SCRAPING → ANALYZING → COMPLETE.
"In the background, a Celery task chain runs: first Reddit is scraped via PRAW, then two HuggingFace models analyze every post, then the validation score is computed."

### Step 4 — Campaign Results Page
- **Demand Score**: "72/100 — this means strong demand. The formula: 60% from positive sentiment ratio, 40% from discussion volume."
- **Intent Breakdown**: "40% of posts show buying intent — real users saying they would pay for something like this."
- **Posts Table**: point to a specific post. "This post was classified as a pain point — the person is frustrated that no tool does X. Our product solves exactly this."

### Step 5 — Dashboard
Select the campaign in the top nav bar. Walk through each widget:
- Sentiment pie chart (real data)
- Trending Topics word cloud (words your potential customers actually use — useful for SEO and ad copy)
- AI Insight cards (driven by real numbers, not a live LLM — reproducible and fast)

### Step 6 — Insights Page
Show the full breakdown: sentiment bar chart, intent progress bars, topics cloud. "This is everything a founder needs to make a build/pivot/discard decision."

---

## Talking Points for Common Evaluator Questions

**"Why Reddit only?"**
Reddit has a free structured API via PRAW, authentic unfiltered discussions, and covers every startup niche. Twitter/X API is now expensive. Quora scraping violates their ToS. Reddit is the pragmatic and academically defensible choice.

**"Why not use a fine-tuned model for intent?"**
Fine-tuning requires 500–1000 labeled Reddit posts per intent class, weeks of annotation, and compute. Zero-shot classification (BART + NLI) gives reasonable results immediately with no labeled data. Academically, zero-shot is a more interesting technique to explain.

**"Why Celery instead of Python async?"**
ML inference is CPU-bound, not I/O-bound. asyncio only helps with I/O (waiting on network/disk). For CPU-heavy work, you need process-level parallelism — Celery with Redis is the industry standard for this.

**"Is the AI Insight using a live LLM?"**
No — intentionally. The insights are logic-driven: they read the real numbers and select the appropriate message. This makes them fast, free, and reproducible. A live LLM call would add latency and cost for no real gain here.

**"What is the 60/40 formula based on?"**
Pure positive ratio is misleading at low volume (1 positive post out of 1 = 100% but meaningless). Pure volume is misleading if all posts are negative. The weighted formula produces a single interpretable number. The thresholds (70/40) are fixed and explainable in a 30-second pitch.

**"What's left to build?"**
"The validation layer is complete. What remains is the action layer: AI-generated comment/response suggestions based on campaign insights, a review and approval workflow, and optional posting to Reddit via our existing PRAW integration. The database table for this — `generated_comments` with a DRAFT/APPROVED/POSTED/REJECTED status — is already designed and in production."

---

## Tech Stack Summary (for evaluators)

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Framer Motion |
| Backend API | FastAPI (Python), Pydantic v2 schemas, JWT authentication |
| Task Queue | Celery with Redis as message broker |
| NLP — Sentiment | `cardiffnlp/twitter-roberta-base-sentiment-latest` (3-class, trained on 124M tweets) |
| NLP — Intent | `facebook/bart-large-mnli` (zero-shot NLI classification) |
| NLP — Topics | Word frequency extraction (no model, fast) |
| Reddit Scraping | PRAW (Python Reddit API Wrapper) |
| Database | PostgreSQL with SQLAlchemy ORM |
| Deployment | Vercel (frontend), Render.com (backend, Docker) |

---

## Database Schema (all tables exist)

```
users
  └── campaigns          (one user → many campaigns)
        └── scraped_data (one campaign → many Reddit posts)
              └── nlp_analysis (one post → one NLP result)
        └── validation_results (one campaign → latest validation score)
        └── generated_comments (one campaign → many AI-generated comment drafts)  ← post-mid feature
```
