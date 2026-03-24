# SurgeAI — Project Memory & Context

> Paste this file into any future AI conversation to restore full context instantly.
> Last updated: 2026-03-22

---

## 4-Day Plan (FYP-2 Evaluation: 2026-03-26)

### Day 1 — NLP Upgrade + Validation Engine Backend ✅ DONE
**Detailed notes:** `day1.md`

| Task | Status |
|---|---|
| Swap sentiment model → `cardiffnlp/twitter-roberta-base-sentiment-latest` (3-class: pos/neu/neg) | Done |
| Fix `_map_label()` for new model's `LABEL_0/1/2` output format | Done |
| Add zero-shot intent detection → `facebook/bart-large-mnli` with 5 labels | Done |
| Add simple topic extraction (word frequency, no model) | Done |
| Create `tasks/validation_engine.py` Celery task | Done |
| Add `ValidationResultRead` schema to `schemas.py` | Done |
| Add `get_latest_validation_result` to `crud.py` | Done |
| Register `tasks.validation_engine` in `celery_worker.py` | Done |
| Extend Celery chain: scrape → NLP → **validation** | Done |
| Add `GET /campaigns/{id}/validation-result` endpoint | Done |
| Add `POST /campaigns/{id}/analyze` re-trigger endpoint | Done |

**Before running:** restart Celery worker + FastAPI server. Run one test campaign to pre-cache the two new models (~2 GB total download, one-time).

---

### Day 2 — Connect Validation Engine to Frontend
**Detailed notes:** `day2.md` (to be created)

| Task | Status |
|---|---|
| Add `getValidationResult(id)` to `client/services/campaign.service.ts` | Pending |
| Add "Idea Validation Score" card to campaign results page | Pending |
| Add intent breakdown chart to campaign results page | Pending |
| Connect main dashboard `SentimentDistribution` widget to real API data | Pending |
| Remove / replace hardcoded stats (2.4M engagement, 340% ROI, 96.7% accuracy) | Pending |

---

### Day 3 — Polish + End-to-End Testing
**Detailed notes:** `day3.md` (to be created)

| Task | Status |
|---|---|
| Full end-to-end test: register → campaign → scrape → results | Pending |
| Add loading/polling state on results page while campaign is SCRAPING | Pending |
| Add `intent` column to `ScrapedDataTable` | Pending |
| Visual polish on validation score card (circular progress ring) | Pending |
| Fix any bugs surfaced during testing | Pending |

---

### Day 4 — Dry Run + Demo Prep
**Detailed notes:** `day4.md` (to be created)

| Task | Status |
|---|---|
| Full demo dry run start to finish | Pending |
| Pre-create a campaign with real data the night before | Pending |
| Prepare talking points for each screen | Pending |
| Record a backup video of the flow in case of live demo failure | Pending |

---

## What SurgeAI Is

AI-powered web app that helps startups validate product ideas by scraping Reddit, running NLP sentiment analysis, and producing an "idea validation score". Built as a Final Year Project (FYP) at FAST-NUCES Lahore by Aneeq Zafar, Abdul Haseeb, Muhammad Ayaz. Advisor: Razi Uddin. **FYP-2 evaluation: 2026-03-26.**

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, shadcn/ui, Tailwind, Recharts, Framer Motion |
| Backend | FastAPI, Celery, Redis, PostgreSQL, SQLAlchemy |
| NLP/ML | HuggingFace Transformers (PyTorch) |
| Scraping | PRAW (Reddit only — Twitter/Quora dropped) |
| Deployment | Vercel (frontend), Render.com (backend, Docker) |

---

## Project Structure

```
SurgeAI/
├── client/                         # Next.js frontend
│   ├── app/
│   │   ├── (public)/               # login, signup, forgot-password, landing
│   │   └── client/                 # protected dashboard routes
│   │       ├── page.tsx            # Main dashboard (DashboardContent)
│   │       ├── campaigns/
│   │       │   └── [campaign_id]/results/page.tsx  # Campaign results (REAL DATA)
│   │       ├── analytics/
│   │       ├── comments/
│   │       ├── keywords/
│   │       └── settings/
│   ├── components/
│   │   └── dashboard/
│   │       ├── widgets/            # SentimentDistribution, EngagementHeatmap, TrendingKeywords, AIMarketingSuggestion
│   │       ├── SentimentChart.tsx
│   │       └── ScrapedDataTable.tsx
│   └── services/
│       ├── campaign.service.ts     # API calls for campaigns
│       └── auth.service.ts
│
└── server/                         # FastAPI backend
    ├── app/
    │   ├── main.py                 # All API endpoints
    │   ├── models.py               # SQLAlchemy models
    │   ├── schemas.py              # Pydantic schemas
    │   ├── crud.py                 # DB operations
    │   ├── auth.py                 # JWT auth logic
    │   └── services/email_service.py
    └── tasks/
        ├── celery_worker.py        # Celery app config (Redis broker)
        ├── reddit_scraper.py       # Celery task: PRAW scraping
        └── nlp_analysis.py         # Celery task: HuggingFace sentiment
```

---

## Database Models (all tables exist in PostgreSQL)

- `users` — email, password_hash, role (CLIENT/ADMIN), JWT reset tokens
- `campaigns` — name, description, keywords_text, platforms[], status, user_id FK
- `keywords` — keyword text, campaign_id FK
- `keyword_activities` — post_count, engagement_count per keyword per platform
- `scraped_data` — post_id, post_url, content, author, engagement_score, platform
- `nlp_analysis` — sentiment_label, sentiment_score, topics (JSON), keywords_extracted (JSON), intent (String)
- `validation_results` — demand_score (0-100), sentiment_aggregate, positive/negative/neutral counts, summary text
- `generated_comments` — generated_comment, status (DRAFT/APPROVED/POSTED/REJECTED)

---

## What Is Actually Implemented (verified 2026-03-22)

### Backend — DONE ✅
- Full JWT auth: register, login, logout, refresh token, password reset, change password
- Campaign CRUD (with user ownership — users only see their own campaigns)
- Keyword CRUD: bulk create, delete, stats, rankings, activity tracking
- Reddit scraping via PRAW as a Celery task:
  - Searches `startups+SideProject+smallbusiness+Entrepreneur` subreddits
  - Rate-limit handling with exponential backoff
  - Deduplication by `post_id`
- NLP sentiment analysis as a Celery task:
  - Model: `distilbert-base-uncased-finetuned-sst-2-english` (binary — needs upgrade)
  - Lazy-loaded pipeline
  - Maps POSITIVE/NEGATIVE to sentiment_label + sentiment_score in [-1, 1]
- Celery chain: scrape → NLP runs automatically after scrape completes
- `GET /campaigns/{id}/sentiment-summary` → real data (counts + percentages)
- `GET /campaigns/{id}/posts` → scraped posts with nested NLP analysis

### Backend — MISSING ❌
- **Validation Engine**: `ValidationResult` table exists but nothing ever writes to it. No Celery task, no endpoint. This is the core FYP-2 deliverable.
- **Intent detection**: `intent` field in `nlp_analysis` always NULL
- **Topics / keyword extraction**: both fields always NULL
- **`keyword_id` not set on scraped posts**: `reddit_scraper.py` creates `ScrapedData` without assigning `keyword_id`

### Frontend — DONE ✅
- Auth flows: login, signup, forgot password, landing page
- Campaign list page + create campaign modal
- Campaign results page (`/client/campaigns/[id]/results`): fetches real API data, shows SentimentChart + ScrapedDataTable + stats cards
- `campaign.service.ts`: getCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign, getCampaignScrapedData, getCampaignSentimentSummary

### Frontend — MISSING / BROKEN ❌
- **Main dashboard widgets are ALL hardcoded mock data**:
  - `SentimentDistribution.tsx`: hardcoded `[{68% positive, 22% neutral, 10% negative}]`
  - `AIMarketingSuggestion.tsx`: hardcoded rotating suggestions array
  - `EngagementHeatmap.tsx` and `TrendingKeywords.tsx`: also mock data
  - Stats cards show "2.4M engagement", "340% ROI", "96.7% AI Accuracy" — all fake
  - `DashboardContent.tsx:11` has `// TODO: Use selectedCampaignId` comment
- No validation score UI anywhere

---

## FYP-2 Priority Plan (4 days: March 22–25)

### Priority 1: Validation Engine (Day 1 afternoon)
Create `server/tasks/validation_engine.py` with a Celery task:
- Aggregates NLPAnalysis rows for the campaign
- Computes `demand_score` (0–100): `min(100, positive_pct * 0.6 + min(total_posts, 50)/50 * 40)`
- Computes `sentiment_aggregate` (average of sentiment_scores)
- Writes a human-readable `summary` string
- Saves to `ValidationResult` table

Add to Celery chain in `main.py`:
```python
chain(
    scrape_reddit_for_campaign.s(campaign_id),
    run_sentiment_for_campaign.si(campaign_id),
    compute_validation_score.si(campaign_id)
).apply_async()
```

Add `GET /campaigns/{id}/validation-result` endpoint.

### Priority 2: Better NLP Model (Day 1 morning — 30 min)
Swap in `nlp_analysis.py`:
```
distilbert-base-uncased-finetuned-sst-2-english  →  cardiffnlp/twitter-roberta-base-sentiment-latest
```
This model outputs true 3-class (LABEL_0=negative, LABEL_1=neutral, LABEL_2=positive). Trained on Twitter — much better for Reddit informal language. Update `_map_label()` accordingly.

### Priority 3: Intent Detection (Day 1 morning — 2-3 hrs)
Add zero-shot classification pipeline in `nlp_analysis.py`:
```
facebook/bart-large-mnli
```
Labels: `["buying intent", "pain point", "feature request", "positive feedback", "general discussion"]`
Store top intent in `nlp_analysis.intent` field.

### Priority 4: Connect Validation to UI (Day 2)
On campaign results page:
- Add `getValidationResult(id)` to `campaign.service.ts`
- Add "Idea Validation Score" card (demand_score/100, color-coded: green ≥70, yellow ≥40, red <40)
- Show `summary` text
- Show intent breakdown chart

### Priority 5: Fix Hardcoded Dashboard (Day 2)
**Must do before evaluation** — evaluator will ask what "2.4M engagement" means.
Connect `SentimentDistribution` widget to real `/campaigns/{id}/sentiment-summary` using `selectedCampaignId`. Remove or hide fake stats.

---

## Demo Flow for Evaluator

1. Login → show auth system
2. Create campaign: "AI writing assistant" + keywords: `["AI writing", "content creation", "writing tool"]`
3. Show status: PENDING → SCRAPING → COMPLETED (use pre-run campaign for live demo)
4. Campaign Results page:
   - **Idea Validation Score**: e.g. "72/100 — Strong demand signal"
   - **Sentiment breakdown**: real pie chart from actual Reddit posts
   - **Intent breakdown**: buying intent %, pain points %, etc.
   - **ScrapedDataTable**: actual Reddit posts with sentiment + intent labels
   - Narrative: *"This Reddit post about frustration with expensive tools was classified as a pain point — our product solves this"*
5. Main Dashboard: connected sentiment widget

**Key talking point**: *"Unlike surveys or manual research, SurgeAI scrapes real organic discussions, runs NLP to detect sentiment and buying intent, and gives a validation score automatically."*

---

## What NOT to Show

- The hardcoded "2.4M engagement / 340% ROI / 96.7% accuracy" stats — remove before demo
- Twitter/Quora scraping — dropped, don't mention
- Comment auto-posting — dropped for ethical/ToS reasons, say "comment suggestions are generated but not auto-posted"

---

## Key File Locations

| What | Where |
|---|---|
| All API endpoints | `server/app/main.py` |
| Celery tasks | `server/tasks/` |
| NLP model swap | `server/tasks/nlp_analysis.py:17` |
| Validation engine (to create) | `server/tasks/validation_engine.py` (doesn't exist yet) |
| Campaign results page | `client/app/client/campaigns/[campaign_id]/results/page.tsx` |
| Dashboard widgets (mock data) | `client/components/dashboard/widgets/` |
| Campaign API service | `client/services/campaign.service.ts` |
