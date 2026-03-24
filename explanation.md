# SurgeAI — Complete Product Explanation

---

## What is SurgeAI?

SurgeAI is a **startup idea validation tool**. Its job is to answer one question:

> "Is there real demand on the internet for the product I want to build?"

A founder enters a product idea (e.g. "AI scheduling tool for freelancers") and a set of keywords. SurgeAI goes to Reddit, finds real discussions about those keywords, runs NLP on every post to understand how people feel and what they want, and then produces a demand score and a set of insights to help the founder decide: build, pivot, or discard.

The key insight behind SurgeAI: **Reddit is a goldmine of authentic, unfiltered opinions**. Unlike surveys or interviews, Reddit users are not trying to please anyone — they complain openly, ask for solutions publicly, and express buying intent without knowing a product exists yet.

---

## Who is it for?

- Early-stage founders testing an idea before committing months of development
- Startup teams deciding between two product directions
- FYP evaluators looking at a working AI-powered web application

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Framer Motion |
| Backend API | FastAPI (Python), Pydantic v2 schemas, JWT authentication (access + refresh tokens) |
| Task Queue | Celery with Redis as the message broker |
| NLP | HuggingFace Transformers (`cardiffnlp/twitter-roberta-base-sentiment-latest` + `facebook/bart-large-mnli`) |
| Reddit Scraping | PRAW (Python Reddit API Wrapper) |
| Database | PostgreSQL with SQLAlchemy ORM |
| Auth | JWT (access token in memory, refresh token in httpOnly cookie) |

---

## The Database (what gets stored)

```
users
  └── campaigns          (one user → many campaigns)
        └── scraped_data (one campaign → many Reddit posts)
              └── nlp_analysis (one post → one NLP result)
        └── validation_results (one campaign → one validation result per run)
```

| Table | What it holds |
|---|---|
| `users` | Email, hashed password |
| `campaigns` | Name, keywords, status (pending → scraping → analyzing → complete) |
| `scraped_data` | Reddit post title, body, URL, upvotes, subreddit |
| `nlp_analysis` | sentiment_label, sentiment_score, intent, topics (JSON) |
| `validation_results` | demand_score (0–100), sentiment_aggregate, positive/negative/neutral counts, summary text |

---

## The Backend Pipeline

When a user creates a campaign, this happens automatically:

```
User clicks "Create Campaign"
        │
        ▼
FastAPI: POST /campaigns
  - Inserts Campaign row (status = "pending")
  - Fires off a Celery chain of 3 tasks
        │
        ▼
[Task 1] scrape_reddit_for_campaign
  - Uses PRAW to search Reddit for the campaign's keywords
  - For each matching post: inserts a ScrapedData row
  - Updates campaign status → "scraping" then → "analyzing"
        │
        ▼
[Task 2] run_sentiment_for_campaign
  - Loads HuggingFace models (lazy — cached after first use)
  - For each post without an NLPAnalysis row:
      * Sentiment: cardiffnlp model → LABEL_0/1/2 → positive/neutral/negative
      * Intent: BART zero-shot classification against 5 labels
      * Topics: word frequency extraction (top 5 words per post)
  - Inserts NLPAnalysis row per post
  - Updates campaign status → "complete"
        │
        ▼
[Task 3] compute_validation_score
  - Reads all NLPAnalysis rows for the campaign
  - Counts positive / negative / neutral
  - Computes demand_score: (positive_pct × 0.6) + (volume_score × 0.4)
  - Writes a ValidationResult row
```

**Why Celery instead of running everything in the API request?**
Scraping Reddit + running two ML models on 50 posts takes 2–5 minutes. An HTTP request cannot stay open that long. Celery runs the work in a separate background process; the API returns immediately with a 202 and the frontend polls for completion.

---

## The NLP Models

### Sentiment: `cardiffnlp/twitter-roberta-base-sentiment-latest`
- Trained on 124 million tweets
- Produces 3 classes: positive (LABEL_2), neutral (LABEL_1), negative (LABEL_0)
- Runs in batch (all posts in one forward pass — fast)
- Why not the default DistilBERT? That model is trained on movie reviews and has no neutral class. SurgeAI needs all three.

### Intent: `facebook/bart-large-mnli`
- Zero-shot classification — no training on SurgeAI data needed
- Given a Reddit post and a list of candidate labels, it picks the closest one using natural language inference
- Labels used:
  - **buying intent** — "I would pay for X"
  - **pain point** — "I'm frustrated that nothing does X"
  - **feature request** — "I wish product X had Y"
  - **positive feedback** — "I love how X works"
  - **general discussion** — everything else

### Topics: word frequency
- No model needed
- Finds all words ≥4 characters, removes stopwords (including Reddit-specific noise like "reddit", "comment", "https")
- Returns top 5 most frequent words per post
- Aggregate across posts → the "Trending Topics" word cloud on the dashboard

---

## The Demand Score Formula

```
demand_score = (positive_pct × 0.6) + (volume_score × 0.4)

where:
  positive_pct = (positive_posts / total_posts) × 100   → 0 to 100
  volume_score = (min(total_posts, 50) / 50) × 100      → 0 to 100, capped at 50 posts
```

**Score interpretation:**
| Score | Signal | What to do |
|---|---|---|
| 70–100 | Strong demand | Build an MVP |
| 40–69 | Moderate demand | Refine your value proposition |
| 0–39 | Weak demand | Narrow niche or pivot |

**Why this formula?**
- Pure positive ratio is misleading: 1 positive post out of 1 = 100% but tells you nothing.
- Pure volume is misleading: 50 posts that all complain about your idea is not demand.
- The 60/40 split prioritises sentiment (are people positive?) over volume (are people talking?).
- Volume caps at 50 posts — beyond that, more posts don't add information, just noise.

---

## The Frontend — Page by Page

### Login / Register
Standard JWT auth. On login, the backend returns an access token (stored in memory) and sets a refresh token in an httpOnly cookie. The refresh token is used to silently renew the access token without re-login.

---

### Campaigns Page (sidebar: "Campaigns")
The main workspace. Shows all campaigns belonging to the logged-in user.

**"How it works" section (for new users):**
1. Enter your product idea and keywords
2. SurgeAI scrapes Reddit for real discussions
3. NLP models analyze sentiment, intent, and topics
4. View your Insights and Demand Score

**Creating a campaign:**
- Fill in campaign name + keywords
- Click "Create Campaign"
- The page shows the campaign card with a "pending" badge
- Status updates automatically via polling

---

### Campaign Results Page (`/campaigns/{id}/results`)
The per-campaign deep-dive page. Accessed by clicking a campaign card.

**If still processing:** Shows a yellow processing banner. Polls every 5 seconds automatically — you don't need to refresh.

**Once complete:**
- **Validation Score Card** — big number (0–100), color-coded, plus the auto-generated summary text
- **Intent Breakdown** — percentage breakdown of what users were trying to say in those posts
- **Posts Table** — every Reddit post that was scraped, with columns: subreddit, title, score (upvotes), sentiment, intent, view link

---

### Dashboard Page
High-level overview of the currently selected campaign (selected from the top nav bar).

**Stats Cards (bottom):**
- Posts Analyzed — total posts scraped
- Positive Sentiment — % of posts classified as positive
- Demand Score — the 0–100 score

**Widgets (top grid):**

#### Sentiment Distribution (top-left)
Pie chart showing positive / neutral / negative breakdown. Real data from the API. Updates when you switch campaigns.

#### Reddit Activity Pattern (top-right)
A 7×24 heatmap (days × hours) showing typical Reddit posting activity. This is **illustrative data** — not from your specific campaign. It represents general Reddit activity patterns (morning peaks, lunch, evenings on weekdays; midday on weekends). Useful for knowing when to post your launch announcement. Deterministic so it doesn't flicker on re-render.

#### Trending Topics (bottom-left)
Word cloud of the most frequently mentioned words across all posts in the selected campaign. Font size is proportional to frequency. Data comes from the `topics.top_words` field produced by the NLP pipeline for each post.

#### AI Insight (bottom-right)
3 rotating insight cards, each typed out character-by-character (typewriter effect). These are generated from the campaign's real data:
- **Insight 1:** Based on the demand score tier (strong/moderate/weak)
- **Insight 2:** Based on the top user intent (pain point / buying intent / feature request)
- **Insight 3:** Based on neutral mention count (undecided users who could be converted)

When no campaign is selected, shows generic explainer text about how SurgeAI works.

---

### Insights Page (sidebar: "Insights")
A data-rich analytics view for the selected campaign. Contains:
1. **Idea Validation Score** — same color-coded card as on the results page
2. **Sentiment Breakdown** — bar chart (Recharts) with exact post counts
3. **User Intent Breakdown** — horizontal progress bars for each intent label, with percentages
4. **Top Discussed Topics** — styled word cloud with frequency counts

Shows a loading spinner while data is being fetched. Prompts to select a campaign if none is selected.

---

## End-to-End Walkthrough

Let's trace a real example from beginning to end.

**Scenario:** Ali is building an AI note-taking app for developers. He wants to know if there's real demand on Reddit before spending 6 months building it.

---

### Step 1: Register and log in

Ali goes to the app, creates an account. FastAPI creates a `users` row with a bcrypt-hashed password. He logs in, gets a JWT access token, and lands on the dashboard.

---

### Step 2: Create a campaign

He goes to the Campaigns page, clicks "New Campaign", fills in:
- **Name:** "AI Note-taking for Developers"
- **Keywords:** `developer notes, programming notes, AI notes`

He clicks "Create Campaign."

FastAPI inserts:
```sql
INSERT INTO campaigns (user_id, campaign_name, keywords, status)
VALUES (1, 'AI Note-taking for Developers', 'developer notes,...', 'pending');
```

Then immediately fires the Celery chain. The API returns 201 with the campaign object. The frontend shows the campaign card with a "pending" badge.

---

### Step 3: Background processing (Celery does the work)

The frontend polls every 5 seconds. Meanwhile, in the background:

**Task 1 — Reddit scraping:**
PRAW searches Reddit for "developer notes", "programming notes", "AI notes". Finds posts like:
- r/programming: "Anyone else use Obsidian for dev notes? Wish it had AI autocomplete"
- r/learnprogramming: "How do you all keep notes while learning a new framework?"
- r/devops: "I'd pay for a tool that automatically documents my terminal sessions"

Each post gets inserted into `scraped_data`.

**Task 2 — NLP analysis:**
For each post, the models run:
- cardiffnlp: "I'd pay for a tool..." → LABEL_2 → **positive**, score 0.91
- BART: "I'd pay for a tool..." → **buying intent** (0.87 confidence)
- Topics: ["notes", "terminal", "sessions", "docs", "tool"]

Inserted into `nlp_analysis`.

**Task 3 — Validation score:**
Say 30 posts were found: 18 positive, 8 neutral, 4 negative.
```
positive_pct = (18/30) × 100 = 60
volume_score = (min(30, 50)/50) × 100 = 60
demand_score = (60 × 0.6) + (60 × 0.4) = 36 + 24 = 60
```

Summary generated:
> "30 Reddit posts analyzed. 18 positive, 4 negative, 8 neutral. Moderate demand signal. Top user intent: 'buying intent' (40% of posts)."

Inserted into `validation_results`.

---

### Step 4: Results appear

The frontend's polling hits `GET /campaigns/1/validation-result` and gets the result. The processing banner disappears. The ValidationScoreCard appears in yellow (score = 60, moderate demand).

Ali sees:
- **60/100** demand score (yellow — moderate)
- "Moderate demand signal. 40% of posts show buying intent."
- Posts table: 30 rows, one per Reddit post, with intent labels visible

---

### Step 5: Dashboard view

Ali selects the campaign in the top nav bar. The dashboard widgets all update:

- **Stats:** 30 posts · 60.0% positive · 60/100 demand
- **Sentiment pie:** 60% green, 26.7% yellow, 13.3% red
- **Trending Topics:** "notes" (large), "tool" (medium), "docs" (small)...
- **AI Insight (1st card):** "Moderate demand signal (60/100). Interest exists but is not overwhelming. Refine your value proposition and focus on the 4 posts with negative sentiment — they reveal what the market is missing."
- **AI Insight (2nd card):** "40% of posts show buying intent — users are actively searching for a solution like yours. These are high-value leads worth targeting first."

---

### Step 6: Insights page

Ali clicks "Insights" in the sidebar. He sees:

- The validation score card (60/100, yellow)
- Sentiment bar chart: Positive=18, Neutral=8, Negative=4
- Intent breakdown: buying intent 40%, pain point 30%, feature request 20%, general discussion 10%
- Top topics word cloud: notes, tool, sessions, docs, terminal

**What Ali concludes:** There's moderate demand. People express buying intent (they'd pay) but the volume is not huge. He should look at the 6 pain point posts to understand exactly what frustrates users, and the 4 feature request posts to define his MVP. He doesn't need to pivot — but he needs to be more specific about the niche (developer terminal automation vs. general note-taking).

---

### What the Three Dashboard Widgets Actually Mean

**Engagement Heatmap (Reddit Activity Pattern):**
This shows when Reddit users are most active in general. It is NOT specific to your campaign's posts. Use it to time your marketing: if you're posting on r/programming to get feedback on your launch, post on a Tuesday at 9am or 8pm — those are the peak hours the heatmap shows.

**Trending Topics:**
These are the most frequent words across all analyzed posts for your campaign. They tell you the vocabulary your potential customers use when talking about this problem space. If "terminal" keeps coming up and you weren't thinking about terminal integration, that's a product signal. These words are also good for SEO and ad copy — they're the exact words your audience uses.

**AI Insight (the typewriter card):**
This is not a live LLM call. It's a logic-driven insight generator built from your campaign's real numbers. The insights cycle through 3 cards:
1. Score-based advice (what your demand score means for your roadmap)
2. Intent-based insight (what the dominant user intent means for your messaging)
3. Neutral-user insight (how many undecided users you could convert with the right message)

Clicking the refresh button cycles to the next insight. The typewriter effect is purely cosmetic — it types one character every 18ms to simulate "AI thinking."

---

## Key Engineering Decisions Worth Explaining to Evaluators

**1. Why zero-shot classification instead of a fine-tuned model?**
Zero-shot (BART + NLI) requires no labeled training data. Fine-tuning would require 500–1000 labeled Reddit posts per intent class, weeks of annotation work, and compute. For a university project, zero-shot gives reasonable results immediately and is academically defensible.

**2. Why Celery instead of Python async?**
ML inference is CPU-bound, not I/O-bound. `asyncio` doesn't help with CPU-bound work — you need a real process-level task queue. Celery with Redis is the industry standard for this pattern.

**3. Why Reddit-only?**
Reddit has structured API access via PRAW, a large volume of authentic discussion, and a wide range of subreddits covering every niche. Twitter/X API is expensive and rate-limited. Quora scraping violates ToS. Reddit is the pragmatic choice for a university FYP.

**4. Why the 60/40 demand score formula?**
Volume alone is a vanity metric. Sentiment alone is misleading at low volume. The weighted formula produces a single number that is easy to explain, thresholds are interpretable (70 = green light), and the formula is defensible with a brief explanation.

**5. Why does the heatmap use illustrative data?**
SurgeAI scrapes post content, not timestamps in a granular enough format to build a real activity heatmap per campaign. Rather than show a broken or empty widget, the heatmap shows general Reddit activity patterns — clearly labelled as "(illustrative)" — which still provides useful marketing guidance.
