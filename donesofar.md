# SurgeAI — Implementation Log (Done So Far)

---

# Day 1 — NLP Upgrade + Validation Engine Backend

## Files Changed

| File | Action |
|---|---|
| `server/tasks/nlp_analysis.py` | Rewritten — new sentiment model, intent detection, topic extraction |
| `server/tasks/validation_engine.py` | Created — Celery task for computing validation score |
| `server/app/schemas.py` | Added `ValidationResultRead` schema |
| `server/app/crud.py` | Added `get_latest_validation_result` function |
| `server/tasks/celery_worker.py` | Registered `tasks.validation_engine` module |
| `server/app/main.py` | Extended Celery chain + added 2 new endpoints |

---

## Part 1 — NLP Upgrade (`tasks/nlp_analysis.py`)

### Change 1: Swapped the sentiment model

**Old (default distilbert):**
```python
pipeline("sentiment-analysis", device=...)
# loads: distilbert-base-uncased-finetuned-sst-2-english
```

**New:**
```python
pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    device=0 if torch.cuda.is_available() else -1,
)
```

**Why:** The old model was trained on movie reviews (SST-2 dataset) and had two problems:
1. It only outputs POSITIVE or NEGATIVE — never neutral. The `_map_label` function could never produce "neutral" because that class simply didn't exist in the model.
2. Movie review language is completely different from Reddit startup discussions.

`cardiffnlp/twitter-roberta-base-sentiment-latest` is trained on 124 million tweets — informal text much closer to Reddit. It has a true 3-class output:
- `LABEL_0` = negative
- `LABEL_1` = neutral
- `LABEL_2` = positive

The DB will now actually have neutral entries, giving a more realistic sentiment breakdown.

---

### Change 2: Fixed `_map_label()` for the new model's output format

**Old:**
```python
def _map_label(label):
    label = label.lower()
    if "positive" in label: return "positive"
    if "negative" in label: return "negative"
    return "neutral"
```

**New:**
```python
def _map_label(label):
    label = (label or "").upper()
    if label in ("LABEL_2", "POSITIVE"): return "positive"
    if label in ("LABEL_0", "NEGATIVE"): return "negative"
    return "neutral"
```

**Why:** The new model doesn't output the string `"POSITIVE"` — it outputs `"LABEL_2"`. The old function's `"positive" in label` check would never match `"LABEL_2"`, meaning everything would have been mapped to "neutral" — completely wrong results. The new function handles both formats safely (uppercase comparison avoids any case mismatch).

---

### Change 3: Added a second lazy-loaded pipeline for intent detection

```python
_intent_pipeline = None

def get_intent_pipeline():
    global _intent_pipeline
    if _intent_pipeline is None:
        _intent_pipeline = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli",
            device=0 if torch.cuda.is_available() else -1,
        )
    return _intent_pipeline
```

**Why `facebook/bart-large-mnli`:** This is a zero-shot NLI (Natural Language Inference) model. Zero-shot means it can classify text into any labels you give it at runtime — no training on your data needed. You give it a Reddit post and a list of candidate labels, and it uses logical entailment to pick the closest one.

**Why the same lazy-load pattern as sentiment:** The model (~1.6 GB) loads once when the Celery worker first processes a task, then stays in memory for every subsequent task. Loading it fresh on every call would add 30+ seconds per task just for model initialization.

---

### Change 4: Added intent labels

```python
INTENT_LABELS = [
    "buying intent",
    "pain point",
    "feature request",
    "positive feedback",
    "general discussion",
]
```

**Why these labels:** These are the categories that matter for startup idea validation:
- **buying intent** — "I would pay for something that does X" → strong demand signal
- **pain point** — "I'm so frustrated that nothing does X" → your product solves a real problem
- **feature request** — "I wish existing tools had X" → product direction insight
- **positive feedback** — "I love tool X for this" → competitor analysis signal
- **general discussion** — catch-all for everything else

The top-scoring label is stored in the `nlp_analysis.intent` column which was always NULL before.

---

### Change 5: Added topic extraction (no model needed)

```python
_STOPWORDS = {
    "the", "a", "an", "and", "or", ... "reddit", "post", "comment", "https", "title",
}

def _extract_topics(text: str, top_n: int = 5) -> dict:
    words = re.findall(r'\b[a-z]{4,}\b', text.lower())
    filtered = [w for w in words if w not in _STOPWORDS]
    counts = Counter(filtered)
    return {"top_words": [w for w, _ in counts.most_common(top_n)]}
```

**Why this approach:** The `topics` JSON column was always NULL. A topic model like LDA would take more effort than it's worth for a demo. This uses simple word frequency: find all words ≥4 characters, strip stopwords, take the top 5 by count. Example output: `{"top_words": ["startup", "product", "users", "pricing", "saas"]}`.

The stopword list includes Reddit-specific noise (`"reddit"`, `"comment"`, `"title"`, `"https"`) so scraping artifacts don't pollute results.

---

### Change 6: Restructured the main task loop

**Old:** One batch sentiment call → one loop to save.

**New:** One batch sentiment call → one loop that also runs intent per-post and extracts topics.

```python
# Sentiment: batch (all posts in one forward pass — fast)
sentiment_results = sentiment_pipe(texts, truncation=True, max_length=512)

# Intent + Topics: per post
for row, sent_res in zip(rows, sentiment_results):
    intent_res = intent_pipe(text[:1024], candidate_labels=INTENT_LABELS, ...)
    topics = _extract_topics(text)
```

**Why intent is per-post, not batched:** Zero-shot classification runs independent NLI inferences for each label against each text. Per-post processing also allows `try/except` per post — if one post fails, the rest still get processed.

**Why `text[:1024]` for intent:** BART has a max token limit. Long Reddit posts could cause failures or timeouts. Truncating to 1024 characters captures the most relevant content (usually the title + first paragraph) without risk.

---

### No changes to `requirements.txt`

`transformers` and `torch` are already installed. Both `cardiffnlp/twitter-roberta-base-sentiment-latest` and `facebook/bart-large-mnli` are standard HuggingFace models — they download automatically on first use and cache to `~/.cache/huggingface/`.

**Important:** The first time the Celery worker runs after this change, it downloads both models:
- cardiffnlp model: ~500 MB
- BART: ~1.6 GB

Run a test campaign **before evaluation day** so the models are pre-cached.

---

### DB check for NLP upgrade

No schema changes needed. All columns already existed:

| Column | Type | Status |
|---|---|---|
| `sentiment_label` | Enum(positive, negative, neutral) | `neutral` was always in the enum ✅ |
| `topics` | JSON, nullable | Already there, now populated ✅ |
| `intent` | String(50), nullable | Already there, now populated ✅ |

Longest intent label is "general discussion" = 18 chars — well under the 50-char limit.

---

### What to do about existing NLP data

The task only processes posts where no `NLPAnalysis` row exists yet. Existing campaigns analyzed with the old model have rows with NULL intent, NULL topics, and no neutral sentiment.

**Option A (recommended):** Create a fresh campaign for the demo. New posts go through the upgraded pipeline automatically.

**Option B:** Re-analyze an existing campaign. Delete its NLP rows, then hit the re-analyze endpoint:

```sql
DELETE FROM nlp_analysis
WHERE data_id IN (
    SELECT data_id FROM scraped_data WHERE campaign_id = <id>
);
```

```
POST /campaigns/<id>/analyze
```

---

## Part 2 — Validation Engine

### Overview

The `ValidationResult` table and model existed from FYP-1 but nothing ever wrote to it. Part 2 wires everything up.

### Full pipeline after Day 1

```
POST /campaigns
    │
    ├── DB: insert Campaign row
    │
    └── Celery chain:
        │
        ├── [Task 1] scrape_reddit_for_campaign
        │     PRAW → finds posts → inserts ScrapedData rows
        │
        ├── [Task 2] run_sentiment_for_campaign
        │     cardiffnlp model  → sentiment_label + sentiment_score per post
        │     bart-large-mnli   → intent per post
        │     word frequency    → topics per post
        │     → inserts NLPAnalysis rows
        │
        └── [Task 3] compute_validation_score   ← NEW
              aggregates NLPAnalysis rows
              → inserts ValidationResult row

GET /campaigns/{id}/validation-result           ← NEW
POST /campaigns/{id}/analyze                    ← NEW
```

---

### `tasks/validation_engine.py` — the Celery task

**What it does, step by step:**
1. Fetches all `NLPAnalysis` rows for the campaign (joined through `ScrapedData`)
2. Counts positive / negative / neutral
3. Computes `demand_score` (0–100)
4. Computes `sentiment_aggregate` (-1 to 1)
5. Builds intent breakdown from the `intent` field
6. Generates a human-readable `summary` string
7. Inserts a new `ValidationResult` row

**The demand score formula:**
```python
positive_pct = (positive_count / total) * 100          # 0–100
volume_score = (min(total_posts, 50) / 50) * 100        # 0–100, capped at 50 posts
demand_score = (positive_pct * 0.6) + (volume_score * 0.4)
```

- **60% from positive sentiment ratio** — do people feel good about this problem space?
- **40% from discussion volume** — are people talking about it at all?

A product with 100% positive sentiment but only 1 post is not validated. A product with 50 posts but mostly negative means people hate the status quo — interesting signal but not pure demand. The 60/40 weighting prioritises sentiment over volume.

**Score tiers:**
| Score | Verdict | Advice |
|---|---|---|
| >= 70 | Strong demand signal | Build an MVP |
| 40–69 | Moderate demand signal | Gather more data |
| < 40 | Weak demand signal | Consider pivoting |

**Intent in the summary:** If intent was populated by the NLP task, the summary includes the dominant intent. Example output:

> "23 Reddit posts analyzed. 14 positive, 5 negative, 4 neutral. Strong demand signal — Real interest exists. Consider building an MVP. Top user intent: 'pain point' (48% of posts)."

This is a concrete FYP talking point: "48% of posts are people expressing a pain point your product solves."

**The `_label_value` helper:**
```python
def _label_value(label) -> str:
    return label.value if hasattr(label, "value") else str(label)
```

SQLAlchemy returns `SentimentLabel` enum objects from the DB, not plain strings. `str(SentimentLabel.positive)` gives `"SentimentLabel.positive"` in newer Python — comparing that to `"positive"` would always be False and all counts would be 0. This helper safely extracts the string value either way.

**Always inserts, never updates:** Each run of the task inserts a new row. The endpoint always fetches the latest by `generated_at DESC`. History is preserved and the freshest result is always shown.

---

### `app/schemas.py` — `ValidationResultRead`

```python
class ValidationResultRead(BaseModel):
    validation_id: int
    campaign_id: int
    demand_score: float | None
    sentiment_aggregate: float | None
    positive_mentions: int
    negative_mentions: int
    neutral_mentions: int
    summary: str | None
    generated_at: datetime

    class Config:
        from_attributes = True
```

Mirrors the `validation_results` DB table exactly. `from_attributes = True` lets FastAPI convert a SQLAlchemy ORM object directly into this schema — no manual mapping needed.

---

### `app/crud.py` — `get_latest_validation_result`

```python
def get_latest_validation_result(db, campaign_id):
    return (
        db.query(models.ValidationResult)
        .filter(models.ValidationResult.campaign_id == campaign_id)
        .order_by(models.ValidationResult.generated_at.desc())
        .first()
    )
```

Filter by campaign, sort newest first, take one. Returns `None` if nothing exists yet (campaign still processing).

---

### `tasks/celery_worker.py` — one-line change

```python
include=['tasks.reddit_scraper', 'tasks.nlp_analysis', 'tasks.validation_engine']
```

Celery imports all listed modules when the worker process boots. Without this line, `compute_validation_score` would be unknown to the worker and the chain would silently fail.

---

### `app/main.py` — chain + 2 endpoints

**Extended chain:**
```python
chain(
    scrape_reddit_for_campaign.s(campaign_id),     # Task 1: PRAW scraping
    run_sentiment_for_campaign.si(campaign_id),    # Task 2: NLP analysis
    compute_validation_score.si(campaign_id),      # Task 3: validation score
).apply_async()
```

`.si()` (immutable signature) means the task ignores whatever the previous task returned and just uses its own `campaign_id` argument. Without this, the string returned by `run_sentiment_for_campaign` (e.g. `"Analysis completed for campaign 3: 10 posts"`) would be passed as an argument to the validation task and cause a crash.

**`GET /campaigns/{id}/validation-result`**
Returns the latest `ValidationResult` for a campaign. Returns 404 with a clear message if the campaign is still processing. The frontend polls this endpoint after campaign creation.

**`POST /campaigns/{id}/analyze`**
Re-triggers only the NLP + validation pipeline (skips re-scraping Reddit). Useful when:
- You cleared old NLP analysis records and want to re-run with the new model
- You want to recompute the validation score without hitting Reddit again

---

### DB check for validation engine

No schema changes needed. `validation_results` table already existed and was just empty.

Both DB constraints are safe with our computed values:

| Column | Constraint | Our value |
|---|---|---|
| `demand_score` | 0 – 100 | Formula output is always 0–100 ✅ |
| `sentiment_aggregate` | -1.0 – 1.0 | Average of scores in [-1, 1] is also in [-1, 1] ✅ |

---

## Day 1 Restart Checklist

After all Day 1 changes:

```
1. Restart Celery worker    — picks up tasks.validation_engine module
2. Restart FastAPI server   — picks up new endpoints + import
3. Pre-cache models         — run one test campaign so BART + cardiffnlp download and cache
4. Fresh campaign for demo  — or delete old NLP rows + POST /campaigns/{id}/analyze
```

---

---

# Day 2 — Frontend Integration

## Files Changed

| File | Action |
|---|---|
| `client/types/campaign.ts` | Added `intent`, `topics` to `NLPAnalysis`; added `ValidationResult` interface |
| `client/services/campaign.service.ts` | Added `getValidationResult()` and `triggerAnalysis()` |
| `client/app/client/campaigns/[campaign_id]/results/page.tsx` | Full rewrite — validation score card, intent breakdown, auto-polling |
| `client/components/dashboard/ScrapedDataTable.tsx` | Added "Intent" column |
| `client/components/dashboard/widgets/SentimentDistribution.tsx` | Connected to real API data; fixed JSX bug |
| `client/components/dashboard/DashboardContent.tsx` | Real stats cards; passes `campaignId` to child widgets |
| `client/components/dashboard/Sidebar.tsx` | Renamed items; removed Keywords page |
| `client/components/dashboard/CampaignsContent.tsx` | Fixed platform text and labels |
| `client/components/dashboard/AnalyticsContent.tsx` | Full rewrite — real sentiment + intent + topic data |
| `client/components/dashboard/widgets/TrendingKeywords.tsx` | Connected to real NLP topic data |
| `client/components/dashboard/widgets/EngagementHeatmap.tsx` | Made deterministic; honest label |
| `client/components/dashboard/widgets/AIMarketingSuggestion.tsx` | Full rewrite — validation-driven insights |

---

## Part 1 — TypeScript Types + Service Layer

### `client/types/campaign.ts` — added fields to `NLPAnalysis`

```typescript
export interface NLPAnalysis {
  // ...existing fields...
  intent: string | null;
  topics: { top_words: string[] } | null;
}
```

The `intent` and `topics` columns existed in the DB but the frontend type didn't know about them. Without this, TypeScript would error when accessing `post.analysis?.intent`.

```typescript
export interface ValidationResult {
  validation_id: number;
  campaign_id: number;
  demand_score: number | null;
  sentiment_aggregate: number | null;
  positive_mentions: number;
  negative_mentions: number;
  neutral_mentions: number;
  summary: string | null;
  generated_at: string;
}
```

Mirrors `ValidationResultRead` from the backend schema exactly. Both sides must agree on field names and types.

---

### `client/services/campaign.service.ts` — two new methods

```typescript
async getValidationResult(campaignId: number): Promise<ValidationResult> {
  const res = await apiClient.get(`/campaigns/${campaignId}/validation-result`);
  return res.data;
}

async triggerAnalysis(campaignId: number): Promise<void> {
  await apiClient.post(`/campaigns/${campaignId}/analyze`);
}
```

`getValidationResult` throws if the server returns 404 (campaign still processing — not yet available). Callers use `.catch(() => null)` to handle this gracefully.

`triggerAnalysis` maps to `POST /campaigns/{id}/analyze` — the re-analysis endpoint that skips re-scraping Reddit and just re-runs NLP + validation.

---

## Part 2 — Campaign Results Page

### `client/app/client/campaigns/[campaign_id]/results/page.tsx` — full rewrite

**What it shows:**
- A processing banner (yellow/orange) while the campaign is still being analyzed
- A `ValidationScoreCard` (color-coded 0–100) once complete
- Intent breakdown: counts each intent label found in the scraped posts, renders as percentage rows
- Existing: the posts table (ScrapedDataTable), now with an Intent column

**Auto-polling pattern:**
```typescript
const fetchData = useCallback(async () => {
  const [postsData, validationData] = await Promise.all([
    campaignService.getCampaignScrapedData(campaignId),
    campaignService.getValidationResult(campaignId).catch(() => null),
  ]);
  setPosts(postsData);
  setValidation(validationData);
}, [campaignId]);

useEffect(() => {
  fetchData();
}, [fetchData]);

// Poll while status is pending or scraping
useEffect(() => {
  if (status !== "pending" && status !== "scraping") return;
  const id = setInterval(fetchData, 5000);
  return () => clearInterval(id);
}, [status, fetchData]);
```

**Why `useCallback` on `fetchData`:** `fetchData` is referenced in both `useEffect` dependency arrays. Without `useCallback`, a new function object is created on every render, which would make the dependency arrays "change" on every render, triggering infinite re-renders and infinite API polls. `useCallback` returns the same function reference as long as `campaignId` doesn't change.

**ProcessingBanner component:**
```typescript
function ProcessingBanner({ status }: { status: string }) {
  return (
    <div className="...yellow border...">
      <Loader2 className="animate-spin" />
      Campaign is being processed ({status})... Results will appear here automatically.
    </div>
  );
}
```

**ValidationScoreCard component:**
Color logic:
- `>= 70` → green (strong demand)
- `>= 40` → yellow (moderate demand)
- `< 40`  → red (weak demand)

Displays: the score as a large number, the summary string from the DB, and raw counts (positive/negative/neutral mentions).

**Intent breakdown (client-side computed):**
```typescript
const intentCounts: Record<string, number> = {};
posts.forEach((p) => {
  if (p.analysis?.intent) intentCounts[p.analysis.intent] = (intentCounts[p.analysis.intent] || 0) + 1;
});
```
The backend doesn't send a pre-computed intent breakdown — it's aggregated on the frontend from the per-post `intent` field. This keeps the backend simple.

---

## Part 3 — ScrapedDataTable Intent Column

### `client/components/dashboard/ScrapedDataTable.tsx`

Added "Intent" as the 3rd column:

```typescript
<TableHead>Intent</TableHead>

// In each row:
<TableCell>
  {post.analysis?.intent
    ? <Badge variant="outline">{post.analysis.intent}</Badge>
    : <span className="text-muted-foreground">—</span>
  }
</TableCell>
```

Also updated the empty-state `colSpan` from 6 → 7 to match the new column count.

---

## Part 4 — Dashboard Widgets Connected to Real Data

### `SentimentDistribution.tsx`

**Before:** Hardcoded pie chart data (`[{name:"Positive",value:62},{name:"Neutral",value:25},{name:"Negative",value:13}]`).

**After:** Accepts `campaignId: number | null` prop. Fetches `getCampaignSentimentSummary(campaignId)` from the API. Shows loading state while fetching. Shows "No campaign selected" placeholder when `campaignId` is null.

**JSX bug fixed:** There was a duplicate `</Pie>` closing tag on line 122 from a previous edit. This caused a Babel parse error that broke the entire dashboard. Removed the extra tag.

---

### `TrendingKeywords.tsx`

**Before:** Generated random words (`["startup", "product", ...]`) with random weights.

**After:** Accepts `campaignId: number | null`. Fetches `getCampaignScrapedData(campaignId)`, then aggregates `post.analysis?.topics?.top_words` across all posts:

```typescript
const counts: Record<string, number> = {};
posts.forEach((post) => {
  post.analysis?.topics?.top_words?.forEach((word) => {
    counts[word] = (counts[word] || 0) + 1;
  });
});
```

Top 20 words are rendered as a word cloud with font size proportional to frequency.

---

### `AIMarketingSuggestion.tsx`

**Before:** Hardcoded generic marketing tips with no campaign awareness.

**After:** Accepts `campaignId: number | null`. Fetches validation result + sentiment summary + posts, then runs `buildInsights()`:

```typescript
function buildInsights(validation, summary, posts): string[] {
  // 3 insights returned based on:
  // 1. Demand score tier (>70 / 40-70 / <40)
  // 2. Top intent label (pain point / buying intent / feature request / other)
  // 3. Neutral mention count (undecided users)
}
```

When no campaign is selected, falls back to 3 generic explainer messages describing what SurgeAI does — so the widget is never empty.

The typewriter animation (18ms interval) and progress dots remain unchanged — they cycle through the 3 insight strings.

---

### `EngagementHeatmap.tsx`

**Change:** The heatmap was already illustrative (not real data from Reddit — no timestamp data is scraped). Changed `Math.random()` calls to deterministic variance based on `(dayIndex * 24 + hour) * 17 % 35`. Now the heatmap is stable across renders (no flickering) and across sessions. Updated subtitle to "(illustrative)" so it's honest.

---

### `DashboardContent.tsx`

**Before:** 3 stats cards with hardcoded values (2.4M posts, 340% engagement, 96.7% retention).

**After:** Fetches `SentimentSummary` and `ValidationResult` for the selected campaign. Real stats:

| Card | Value | Empty state |
|---|---|---|
| Posts Analyzed | `summary.total` | `—` |
| Positive Sentiment | `summary.percentages.positive.toFixed(1)%` | `—` |
| Demand Score | `validation.demand_score.toFixed(0)/100` | `—` |

Also passes `campaignId` down to `SentimentDistribution`, `TrendingKeywords`, and `AIMarketingSuggestion` so they all respond to the same campaign selection.

---

## Part 5 — Sidebar + Navigation Fixes

### `Sidebar.tsx`

| Before | After | Reason |
|---|---|---|
| "Create a Campaign" | "Campaigns" (icon: LayoutGrid) | The page lists all campaigns, not just creation |
| "Analytics" | "Insights" | The page shows NLP-driven insights, not business analytics |
| "Keywords" | Removed entirely | The old Keywords page showed SEO CPC/volume data — completely wrong for SurgeAI |

---

### `CampaignsContent.tsx` (the "How it works" page)

Fixed misleading text in the step descriptions:
- Step 1: "Reddit, X, and Quora" → "Reddit" (SurgeAI only scrapes Reddit)
- Step 4: label fixed to match "Insights" (the renamed sidebar item)
- Keyword hint text updated to accurately describe what the keywords are used for

---

### `AnalyticsContent.tsx` — full rewrite (now "Insights")

**Before:** Completely wrong page. Showed hardcoded revenue charts, visitor counts, conversion funnels — none of which SurgeAI has.

**After:** Three real data sections:

1. **Idea Validation Score** — the 0–100 demand score card, color-coded, with the summary string from the DB
2. **Sentiment Breakdown** — Recharts BarChart with real counts (positive/neutral/negative), each bar colored green/amber/red
3. **User Intent Breakdown** — animated progress bars for each intent label, computed from per-post intent fields
4. **Top Discussed Topics** — word cloud tags scaled by frequency, styled with cyan/blue color scheme

All data comes from: `getCampaignScrapedData`, `getCampaignSentimentSummary`, `getValidationResult`. Shows a loading spinner while fetching, and a "select a campaign" prompt when none is selected.

---

## Day 2 Testing Checklist

```
1. Select a campaign in the top navigation bar
2. Dashboard page:
   - Stats cards show real values (not dashes)
   - Sentiment pie chart shows real percentages
   - Trending Topics shows words from your campaign's posts
   - AI Insight shows campaign-specific insight text (not generic)
3. Insights page:
   - Demand score card appears with color coding
   - Sentiment bar chart shows correct counts
   - Intent breakdown shows percentage bars
   - Topics word cloud renders
4. Campaign results page (/campaigns/{id}/results):
   - If still processing: yellow banner + auto-refresh every 5s
   - If done: ValidationScoreCard appears at the top
   - Posts table shows Intent column
5. Re-analyze: POST /campaigns/{id}/analyze to re-run NLP+validation
```
