# SurgeAI - Startup Validation Platform

## 🎯 What is SurgeAI?

SurgeAI validates startup ideas using **real market data from 8 sources** + **competitor analysis**:
1. **Reddit** - Community discussions, demand, pain points
2. **Google Trends** - Search interest over time
3. **Hacker News** - Technical community insights
4. **Product Hunt** - Existing product launches, competition
5. **Quora** - User Q&A, common questions
6. **Stack Exchange** - Technical pain points, developer questions
7. **Google Search Volume** - Objective search demand data
8. **Google Play Reviews** - App store feedback, competitor complaints, missing features ← NEW

**Output:**
- **Validation Score (0-100)** - Is this idea validated?
- **Confidence Score (0-1)** - How reliable is the analysis?
- **Competitor Analysis** - Top 3 competitors, what they're missing, user complaints
- **Strategic Report** - What to build, what to avoid, how to differentiate
- **Natural Language Summary** - AI-generated insights from Claude

---

## 📊 How It Works

```
User Input: "I want to build a project management app for remote teams"
                          ↓
        System scrapes evidence from 8 sources
        (Reddit, HN, PH, Quora, SE, Trends, Google Play, Search Volume)
                          ↓
        Analyzes 1000+ data points + competitor reviews with NLP
                          ↓
        Calculates 8 dimension scores:
        - Demand (25%): 78/100
        - Pain Points (20%): 85/100
        - TAM Opportunity (20%): 72/100
        - Competition Intensity (15%): 45/100
        - Competitor Vulnerability (10%): 78/100 ← NEW: Gap analysis
        - Monetization Viability (15%): 82/100
        - Engagement Depth (5%): 68/100
                          ↓
        Overall Score: 76/100 ✅ VALIDATED
        Confidence: 0.85/1.0  ✅ HIGH CONFIDENCE
                          ↓
        Competitor Analysis identifies:
        ✓ Top 3 competitors: Asana, Monday.com, Notion
        ✓ What they're missing:
          - "Too complex for beginners" (340+ mentions)
          - "No mobile-first design" (280+ mentions)
          - "Too expensive" (210+ mentions)
        ✓ What NOT to do:
          - Don't build complex UI (Asana users hate it)
          - Don't forget mobile (60% of complaints)
          - Don't overprice (undercut at $8/month)
                          ↓
        Claude AI generates strategic report:
        "VALIDATED with HIGH confidence. The market wants a simpler,
         mobile-first alternative to Asana. Users complain about:
         complexity, mobile limitations, and high pricing.

         STRATEGY: Build simple + mobile + affordable alternative.
         Price at $8/month. Target non-technical teams.
         Competitive advantage: 10x easier to use."
```

---

## 📚 DOCUMENTATION

### Getting Started
1. **[MVP_IMPLEMENTATION_PLAN.md](MVP_IMPLEMENTATION_PLAN.md)** ← **START HERE**
   - Complete project overview
   - What's done vs what needs to be built
   - Week-by-week implementation plan
   - Updated validation score framework for all 7 sources

2. **[DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)**
   - Quick reference for file locations
   - Database schema
   - API endpoints
   - How to add new features
   - Setup & running instructions

3. **[DATA_SOURCES_INTEGRATION.md](DATA_SOURCES_INTEGRATION.md)**
   - Step-by-step guide for each data source
   - How to get API keys
   - Implementation code snippets
   - Rate limiting info
   - Testing each source

---

## 🚀 QUICK START

### Prerequisites
- Python 3.9+
- PostgreSQL
- Redis
- Node.js 18+

### Setup Backend

```bash
# 1. Install dependencies
cd server
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt

# 2. Configure environment
# Create /server/.env with:
# DATABASE_URL=postgresql://user:pass@localhost/surgeai_db
# REDIS_URL=redis://localhost:6379
# SECRET_KEY=your-secret-key
# PRAW_CLIENT_ID=...
# PRAW_CLIENT_SECRET=...
# PRODUCT_HUNT_API_KEY=...
# SERPAPI_API_KEY=...
# ANTHROPIC_API_KEY=...

# 3. Start FastAPI
uvicorn app.main:app --reload --port 8000
```

### Setup Celery Worker

```bash
# In another terminal
cd server
celery -A tasks.celery_worker worker --loglevel=info
```

### Setup Frontend

```bash
cd client
npm install
npm run dev  # Runs on http://localhost:3000
```

### Test the System

```bash
# 1. Create an account
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "password123"}'

# 2. Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "password123"}'

# 3. Create campaign (will trigger scrapers)
curl -X POST http://localhost:8000/campaigns \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "description": "Testing the system",
    "keywords": ["python", "web development"]
  }'

# 4. Monitor Celery tasks
celery -A tasks.celery_worker events

# 5. Get validation report
curl -X GET http://localhost:8000/campaigns/1/report \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 PROJECT STATUS

### ✅ COMPLETED (Week 1)
- [x] User authentication (JWT + password reset)
- [x] Campaign CRUD operations
- [x] Reddit scraper (PRAW)
- [x] Google Trends scraper (pytrends)
- [x] Celery + Redis task queue
- [x] Sentiment analysis (HuggingFace transformers)
- [x] Database schema (11 models)
- [x] 40+ API endpoints
- [x] Frontend dashboard scaffolding

### 🚀 IN PROGRESS (Week 2)
- [ ] Hacker News scraper (STARTED)
- [ ] Product Hunt scraper
- [ ] Quora scraper
- [ ] Stack Exchange scraper
- [ ] Google Search Volume scraper
- [ ] **Google Play scraper (NEW)** ← Extract competitor reviews
- [ ] **Competitor gap analyzer (NEW)** ← What's missing in competitors

### 📋 TODO (Week 3-4)
- [ ] Validation score calculation (8 dimensions + competitor vulnerability)
- [ ] Competitor analysis service
- [ ] Gap & complaint extraction
- [ ] Strategic recommendations
- [ ] Claude AI report generation (with competitive positioning)
- [ ] Dashboard display of validation + competitor analysis
- [ ] Testing & optimization

---

## 🏗️ ARCHITECTURE

### Tech Stack
- **Backend:** FastAPI (Python), PostgreSQL, SQLAlchemy ORM
- **Task Queue:** Celery + Redis
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **NLP:** HuggingFace Transformers
- **AI:** Claude API (Anthropic)
- **UI:** Radix UI (40+ components)

### Data Flow
```
Campaign Creation
    ↓
7 Parallel Celery Tasks (staggered)
    ├─ Reddit scraper (5s delay)
    ├─ HN scraper (10s delay)
    ├─ Product Hunt (15s delay)
    ├─ Quora scraper (20s delay)
    ├─ Stack Exchange (25s delay)
    ├─ Search Volume (30s delay)
    └─ Google Trends (staggered)
    ↓
Raw data stored in database
    ↓
NLP analysis (sentiment, topics, intent)
    ↓
Validation scorer (7 dimensions)
    ↓
Confidence calculator
    ↓
Claude report generator
    ↓
Dashboard display
```

---

## 📊 DATABASE SCHEMA (Updated)

### User Management
- `users` - User accounts with JWT auth

### Campaign Core
- `campaigns` - Marketing campaigns
- `keywords` - Search terms
- `validation_results` - Final scores (8 dimensions)

### Data Sources (8 tables)
- `reddit_data` - Reddit posts/comments
- `hackernews_data` - HN stories/comments
- `product_hunt_data` - PH products
- `quora_data` - Quora Q&A
- `stack_exchange_data` - SE questions
- `search_volume_data` - Google search volume
- `google_trends_point` - Trends time-series
- `google_play_data` - App store data ← NEW
- `google_play_reviews` - App store reviews ← NEW

### Competitor Analysis (NEW - 4 tables)
- `competitors` - Identified competitors
- `competitor_gaps` - Missing features in competitors
- `competitor_complaints` - User complaints about competitors
- `competitor_analysis_results` - Final competitive analysis

### Analysis
- `scraped_data` - Generic data repository
- `nlp_analysis` - Sentiment + extracted topics
- `keyword_activity` - Engagement metrics
- `generated_comments` - AI-generated comments
- `strategic_recommendations` - Generated action items ← NEW

---

## 🔑 API ENDPOINTS

### Authentication
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
POST   /auth/change-password
POST   /auth/forgot-password
POST   /auth/reset-password
```

### Campaigns
```
GET    /campaigns
POST   /campaigns
GET    /campaigns/{id}
PUT    /campaigns/{id}
DELETE /campaigns/{id}
```

### Validation & Reporting
```
GET    /campaigns/{id}/validation-report
GET    /campaigns/{id}/report
POST   /campaigns/{id}/calculate-validation
GET    /campaigns/{id}/validation-data
```

### Data Sources
```
GET    /campaigns/{id}/reddit-data
GET    /campaigns/{id}/hackernews-data
GET    /campaigns/{id}/product-hunt-data
GET    /campaigns/{id}/quora-data
GET    /campaigns/{id}/stack-exchange-data
GET    /campaigns/{id}/search-volume
GET    /campaigns/{id}/google-trends
GET    /campaigns/{id}/sentiment-summary
```

---

## 💡 KEY FEATURES

### Validation Score (0-100)
Measures how validated a startup idea is based on real market data:
- **Demand (25%)** - Is there search interest?
- **Pain (20%)** - Do people have this problem?
- **TAM (20%)** - How big is the market?
- **Competition (15%)** - How saturated is the market?
- **Monetization (15%)** - Can you make money?
- **Engagement (5%)** - How deeply do people discuss it?

### Confidence Score (0-1)
Measures reliability of the validation report:
- 0.8-1.0: Trust this report completely
- 0.6-0.8: Use with some caution
- 0.4-0.6: Take with a grain of salt
- <0.4: Need more data

### AI-Generated Report
Natural language summary of findings using Claude:
- Executive summary
- Top validation signals
- Key risks
- Recommended next steps

---

## 🚀 IMPLEMENTATION ROADMAP

| Week | Deliverable | Status |
|------|------------|--------|
| 1 | Reddit, Google Trends, auth, database | ✅ DONE |
| 2 | All 5 new scrapers (HN, PH, Quora, SE, SV) | 🚀 IN PROGRESS |
| 3 | Validation scorer, confidence scorer | 📋 TODO |
| 4 | Report generator, dashboard, testing | 📋 TODO |

**Target:** Fully functional MVP by end of Week 4

---

## 📚 HOW TO BUILD FEATURES

### Adding a New Data Source

1. **Create database model** in `/server/app/models.py`
2. **Create scraper task** in `/server/tasks/source_scraper.py`
3. **Add CRUD operations** in `/server/app/crud.py`
4. **Add API endpoint** in `/server/app/main.py`
5. **Register in campaign creation** to trigger automatically
6. **Test end-to-end**

See [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) for detailed instructions.

### Adding a New Feature

1. **Design the feature** (what data is needed?)
2. **Update database schema** if needed
3. **Implement business logic** in `/server/app/services/`
4. **Create API endpoint** in `/server/app/main.py`
5. **Add frontend component** in `/client/components/`
6. **Test with real data**

---

## 🐛 TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| PostgreSQL connection error | Check DATABASE_URL in .env |
| Celery tasks not running | Ensure Redis is running, check celery.log |
| Scraper rate limited | Add delays between requests, check API quotas |
| Claude API errors | Verify ANTHROPIC_API_KEY in .env |
| Frontend won't load | Check backend is running, CORS configured |

---

## 📞 SUPPORT

### Documentation
- Read [MVP_IMPLEMENTATION_PLAN.md](MVP_IMPLEMENTATION_PLAN.md) for full details
- Check [DATA_SOURCES_INTEGRATION.md](DATA_SOURCES_INTEGRATION.md) for specific sources
- Reference [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) for code patterns

### Debugging
- Use `python db_viewer.py` to inspect database
- Monitor Celery with `celery -A tasks.celery_worker events`
- Check logs: `tail -f celery.log`

---

## 🎯 SUCCESS CRITERIA FOR MVP

- [ ] Campaign creation in <30 seconds
- [ ] All 7 data sources populate in 3-5 minutes
- [ ] Validation scores calculated automatically
- [ ] Confidence score indicates data reliability
- [ ] AI-generated report reads professionally
- [ ] End-to-end flow works perfectly
- [ ] Dashboard displays all key metrics

---

## 📄 FILE STRUCTURE

```
SurgeAI/
├── server/                 # Python FastAPI backend
│   ├── app/
│   │   ├── main.py        # All endpoints
│   │   ├── models.py      # Database models
│   │   ├── crud.py        # Database operations
│   │   ├── auth.py        # Authentication
│   │   ├── schemas.py     # Pydantic models
│   │   ├── database.py    # PostgreSQL config
│   │   └── services/      # Business logic (CRUD, validation, reports)
│   ├── tasks/             # Celery background jobs
│   │   ├── celery_worker.py
│   │   ├── reddit_scraper.py
│   │   ├── hackernews_scraper.py
│   │   ├── google_trends_scraper.py
│   │   └── ... (4 more scrapers to add)
│   └── requirements.txt
│
├── client/                # Next.js React frontend
│   ├── app/
│   │   ├── (public)/     # Landing, login, signup
│   │   └── client/       # Protected pages
│   ├── components/
│   │   ├── dashboard/    # Dashboard components
│   │   └── ui/          # Radix UI wrappers
│   └── package.json
│
└── DOCUMENTATION
    ├── README.md  (YOU ARE HERE)
    ├── MVP_IMPLEMENTATION_PLAN.md
    ├── DEVELOPMENT_GUIDE.md
    └── DATA_SOURCES_INTEGRATION.md
```

---

## 🚀 NEXT STEPS

1. **Read MVP_IMPLEMENTATION_PLAN.md** (comprehensive overview)
2. **Choose your API keys** (Product Hunt, SerpAPI, Anthropic)
3. **Implement Week 2 tasks** (5 new scrapers)
4. **Test with real campaign** (create, monitor, verify data)
5. **Implement validation scoring** (7 dimensions)
6. **Add report generation** (Claude integration)
7. **Test end-to-end** (campaign → validation → report)

Good luck! 🚀

