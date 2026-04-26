# SurgeAI Document Update Checklist (F25-205)

This file lists everything that needs to be updated in the original FYP documentation to reflect the actual completed system.

---

## 1. Platform References (Affects Almost Every Chapter)

The document repeatedly mentions **Twitter/X** and **Quora** as supported platforms. These were **never implemented**. The actual platforms are **Reddit** and **Hacker News**.

**Find and replace throughout the entire document:**
- "Reddit, Twitter, and Quora" → "Reddit and Hacker News"
- "Reddit, X, Quora" → "Reddit and Hacker News"
- "Reddit, Tweeter and Quaro" → "Reddit and Hacker News" (also fix typos)
- "Twitter API" → remove or replace with "Hacker News API (public, no auth required)"
- "Quora scraper" / "Quora via Selenium" → remove entirely

**Sections specifically affected:**
- Chapter 2: Project Vision (Sections 2.7 Constraints, 2.8 Business Opportunity)
- Chapter 3: Literature Review (every sub-section compares to "Reddit, Twitter, Quora")
- Chapter 4: SRS — Features list, Functional Requirements, AI Engine Requirements, Assumptions, Risk Analysis
- Chapter 5: Design — Technical Assumptions, External Dependencies, API Rate Limits, System Architecture diagram, Subsystem Architecture diagram, Class Diagram
- Chapter 6: Implementation
- Chapter 7: Conclusion and Future Plan

---

## 2. Chapter 4 — Software Requirement Specifications

### 4.1 List of Features
- Remove: "It will connect with Reddit API, X API and Google Trends API and scrap websites such as Quora"
- Replace with: "It connects with Reddit API (via PRAW) and Hacker News public API to acquire user content"
- Remove reference to Google Trends API (not implemented)

### 4.2.3 AI Engine Functional Requirements
- Remove: "request data on such platforms as Reddit, X, Quora and Google Trends"
- Replace with: "request data from Reddit and Hacker News"

### 4.5 Assumptions
- Remove: "APIs such as Reddit, X and Google Trends are stable"
- Replace with: "Reddit API (PRAW) and Hacker News public API are stable and accessible"

### 4.10.1 Technical Risks
- Remove: "Rate limits or access restrictions on Reddit, Twitter, and Quora APIs"
- Replace with: "Rate limits on Reddit API (60 req/min via PRAW). Hacker News is public with no rate limits."
- Remove Selenium scraping risk (Quora not used)

### 4.10.2 Operational Risks
- Update: The expertise gap in NLP has been overcome — NLP pipeline is fully implemented and working. This risk should be re-stated as resolved or removed.

### Data Dictionary — Platform Enum
- Remove values: `TWITTER`, `QUORA`
- Add values: `HACKER_NEWS`, `GOOGLE_PLAY`
- Final values: `REDDIT`, `HACKER_NEWS`, `GOOGLE_PLAY`

---

## 3. Chapter 5 — High-Level and Low-Level Design

### 5.2.1.1 Technical Assumptions
- Remove: "Reddit and Twitter maintain stable APIs with reasonable rate limits"
- Replace with: "Reddit (PRAW) and Hacker News public API maintain stable, accessible interfaces"
- Remove: "Quora lacks an official API so we'll be dependent on scraping via Selenium..."

### 5.2.2.1 Third Party APIs
- Remove: "Twitter API v2"
- Remove: "OpenAI API"
- Add: "Hacker News Firebase API (public, no authentication required)"
- Keep: "Reddit API (PRAW)"
- Keep: "HuggingFace Transformers" (move to APIs section or keep in libraries)

**Note:** OpenAI is NOT used in the current system. Sentiment and intent are handled entirely by local HuggingFace models (`cardiffnlp/twitter-roberta-base-sentiment-latest` and `facebook/bart-large-mnli`).

### 5.2.2.2 Open Source Libraries
- Add: `PRAW (Python Reddit API Wrapper)`
- Add: `cardiffnlp/twitter-roberta-base-sentiment-latest` (sentiment model)
- Add: `facebook/bart-large-mnli` (zero-shot intent classification model)

### 5.2.2.3 Infrastructure Dependencies
- Remove: "Selenium WebDriver" (Quora scraping not implemented)

### 5.2.3.2 External API Rate Limits
- Remove: "Twitter API provides 500,000 tweets per month on free tier"
- Remove: "OpenAI charges per token"
- Add: "Reddit API (PRAW): 60 requests per minute"
- Add: "Hacker News API: public, no rate limits"

### 5.3 System Architecture Diagram (Figure 5.1)
The diagram needs to be redrawn. Current diagram shows:
- "Twitter API" → **Remove**
- "Quora Scraper" → **Remove**
- "OpenAI API" → **Remove**

Add:
- "Hacker News API"
- "HuggingFace Models (local)" as part of NLP processing

### 5.3.1 Subsystem Architecture Diagram (Figure 5.2)
Under "Data Collection" subsystem:
- Remove: "Twitter Scraper"
- Remove: "Quora Scraper" (under Data Collection)
- Replace with: "Hacker News Scraper"

### 5.5 Class Diagram (Figure 5.4)

**Platform Enumeration:**
- Remove: `TWITTER`, `QUORA`
- Add: `HACKER_NEWS`, `GOOGLE_PLAY`

**NLPAnalysis Class — add missing fields:**
- Add: `intent: String` (detected user intent, e.g. "buying intent", "pain point")
- Add: `keywords_extracted: JSON`
- The current diagram only shows `sentimentScore`, `label`, `topics`, `analyzedAt`

**ValidationResult Class — add missing fields:**
- Add: `sentimentAggregate: float` (average sentiment score -1 to 1)
- Add: `neutralMentions: int`

**CampaignStatus Enumeration — add missing statuses:**
- Add: `PENDING`
- Add: `SCRAPING`
- Add: `FAILED`
- Current diagram only shows `ACTIVE`, `PAUSED`, `COMPLETED`

---

## 4. Chapter 6 — Implementation and Test Cases

This chapter currently only describes **FYP-1** work (basic Reddit scraping and baseline NLP). It needs to be completely rewritten to include all **FYP-2** completed work.

### Add the following implemented modules:

#### 6.1.1 Reddit Scraper (update existing)
- Mention that PRAW scrapes multiple subreddits per keyword
- Stores: `post_id`, `post_url`, `content`, `author`, `engagement_score`, `platform`, `scraped_at`
- Unique constraint on `post_id` to prevent duplicate inserts

#### 6.1.2 (New) Hacker News Scraper
- Implemented using Hacker News public Firebase API (no authentication required)
- Searches stories and comments matching campaign keywords
- Stores results in same `scraped_data` table under `platform = HACKER_NEWS`
- Both Reddit and Hacker News scrapers run **in parallel** using Celery group

#### 6.1.3 (New) Full NLP Pipeline
Replace the "Basic NLP Baseline" section with the complete pipeline:
- **Sentiment Analysis**: `cardiffnlp/twitter-roberta-base-sentiment-latest` — classifies each post as positive, negative, or neutral with a score from -1 to 1
- **Intent Detection**: `facebook/bart-large-mnli` zero-shot classification — detects user intent from five labels: "buying intent", "pain point", "feature request", "positive feedback", "general discussion"
- **Topic Extraction**: word-frequency-based extraction of top keywords per post (no model, in-process)
- All three run inside the `run_sentiment_for_campaign` Celery task
- **Important**: Celery worker must be started with `--concurrency=1` because GPU VRAM (4GB on GTX 1650) cannot support multiple worker processes each loading both models simultaneously

#### 6.1.4 (New) Validation Engine
- Aggregates all NLP results for a campaign into a `ValidationResult` row
- **Demand Score formula (0–100)**:
  - 60% positive sentiment ratio
  - 40% discussion volume score (capped at 50 posts = full score)
- Generates a human-readable `summary` string including top intent breakdown
- Verdict levels: "Strong demand signal" (≥70), "Moderate demand signal" (≥40), "Weak demand signal" (<40)
- Sets campaign status to `COMPLETED` on success, `FAILED` on exception

#### 6.1.5 (New) Celery Task Pipeline
- Full async pipeline using Celery with Redis as broker and backend
- Pipeline structure: `(group(reddit_scraper, hn_scraper) | nlp_analysis | validation_engine).apply_async()`
- Scrapers run in parallel; NLP and validation run sequentially after both scrapers finish
- Campaign status transitions: `PENDING` → `SCRAPING` → `COMPLETED` / `FAILED`

#### 6.1.6 (New) Frontend — Campaign Results Page
The results page has four tabs:
- **Overview Tab**: demand score gauge, sentiment breakdown (positive/negative/neutral counts), key metrics
- **Sentiment Tab**: pie chart of sentiment distribution, trend over time
- **Market Signals Tab**: intent breakdown, top keywords/topics
- **Raw Data Tab**: paginated table of all scraped posts with sentiment label, intent, platform, and link

#### 6.1.7 (New) Campaign Management
- Create campaign with title, description, and comma-separated keywords
- Campaign list with status badge (pending/scraping/completed/failed)
- Delete campaign with confirmation dialog — cascades to all related data (scraped_data, nlp_analysis, validation_results, generated_comments)
- Auto-redirect to results page after creation

---

## 5. Chapter 7 — Conclusion and Future Plan

### 7.0 Main Conclusion
The conclusion currently says FYP-2 work is future/planned. It must be updated to reflect that all core features are **completed**:
- Advanced NLP pipeline (sentiment, intent, topic extraction) — **DONE**
- Idea Validation Engine with demand scores — **DONE**
- Multi-platform scraping (Reddit + Hacker News) running in parallel — **DONE**
- Full frontend with results dashboard, charts, and data tables — **DONE**
- Celery async pipeline with Redis — **DONE**

### 7.1 Future Plan — Items to Move to "Completed"
The following items listed as FYP-2 future plans are now **completed** and should be moved to the implementation chapter:
- "Advanced NLP pipeline... sentiment analysis, topic extraction, intent detection" — DONE
- "Fully implement the Idea Validation Engine" — DONE
- "Extend scrapers beyond Reddit... new modules for additional platforms" — DONE (Hacker News added)
- "Celery background workers and Redis queues for large-scale scraping" — DONE

### 7.1 Future Plan — Items Still Remaining (actual future work)
Replace the old FYP-2 plan with genuinely remaining/future features:
- **AI Comment Generator**: Generate contextual marketing comments for high-intent posts using an LLM (OpenAI or similar). Currently the `GeneratedComment` table exists in the schema but the generation feature is not implemented.
- **Google Play Scraper**: The `GOOGLE_PLAY` platform is defined in the enum but the scraper is not yet implemented.
- **Google Trends Integration**: Trend data over time for campaign keywords.
- **n8n Automation Workflows**: Scheduled scraping triggers, email/dashboard notifications.
- **Admin Panel**: User management, system health monitoring — defined in architecture but not yet built.
- **Comment Performance Tracking**: The `CommentPerformance` table is in the schema but tracking is not implemented.
- **Deployment**: Full production deployment on Vercel (frontend) + Render (backend) with environment configs already partially set up.

---

## 6. Recurring Typos to Fix Throughout

| Wrong | Correct |
|-------|---------|
| Tweeter | Twitter (or remove entirely) |
| Quaro | Quora (or remove entirely) |
| seperation | separation |
| conerns | concerns |
| wih | with |
| solultion | solution |
| whaever | whatever |
| sentimental analysis | sentiment analysis |
| Buffre | Buffer |

---

## 7. Minor Updates

- **Section 2.7 Constraints**: Remove Twitter API difficulty as a constraint. Add note about GPU VRAM constraint for running two HuggingFace models simultaneously (requires single Celery worker concurrency).
- **Section 4.3 Quality Attributes**: Add mention of the asynchronous pipeline as a quality attribute for responsiveness.
- **Section 4.4 Non-Functional Requirements**: "validation report in 10-15 seconds" — actual time depends on number of posts and GPU availability; intent detection via bart-large-mnli takes ~5-10 minutes for 100 posts on CPU, much faster on GPU.
- **Section 5.2.3.3 Performance Requirements**: "NLP analysis should be completed within 500ms per post" — this is not achievable for zero-shot intent classification which takes several seconds per post with bart-large-mnli. Update to realistic estimate or note GPU dependency.
- **Bibliography**: Add citations for HuggingFace models used:
  - `cardiffnlp/twitter-roberta-base-sentiment-latest`
  - `facebook/bart-large-mnli`
  - PRAW (Python Reddit API Wrapper)
  - Hacker News Firebase API
