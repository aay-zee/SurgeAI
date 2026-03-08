# SurgeAI Backend Structure Blueprint

## Objective
Define a scalable backend structure for multi-source data ingestion, normalization, analysis, scoring, and final validation report generation.

## Proposed Backend Folder Structure

```text
server/
  app/
    main.py
    api/
      deps.py
      routers/
        auth.py
        campaigns.py
        keywords.py
        sources.py
        insights.py
        reports.py
        outreach.py
    core/
      config.py
      security.py
      logging.py
    db/
      session.py
      base.py
      models/
        user.py
        campaign.py
        keyword.py
        source_config.py
        raw_item.py
        normalized_item.py
        analysis_item.py
        competitor.py
        competitor_evidence.py
        scorecard.py
        report_snapshot.py
        outreach_candidate.py
        outreach_action.py
        pipeline_run.py
      repositories/
        user_repo.py
        campaign_repo.py
        source_repo.py
        ingestion_repo.py
        analysis_repo.py
        competitor_repo.py
        scoring_repo.py
        report_repo.py
        outreach_repo.py
    ingestion/
      contracts.py
      registry.py
      orchestrator.py
      merge/
        canonicalize.py
        dedup.py
        entity_resolution.py
      sources/
        reddit/
          client.py
          extractor.py
          normalizer.py
        google_trends/
          client.py
          extractor.py
          normalizer.py
        hackernews/
          client.py
          extractor.py
          normalizer.py
        stackexchange/
          client.py
          extractor.py
          normalizer.py
        producthunt/
          client.py
          extractor.py
          normalizer.py
        github/
          client.py
          extractor.py
          normalizer.py
        google_play/
          client.py
          extractor.py
          normalizer.py
        google_news/
          client.py
          extractor.py
          normalizer.py
    analysis/
      relevance.py
      sentiment.py
      pain_points.py
      intent.py
      competitor_intel.py
      category_metrics.py
      scoring.py
      confidence.py
    reporting/
      builder.py
      serializers/
        report_json.py
        report_markdown.py
    outreach/
      candidate_selector.py
      ranker.py
      message_drafts.py
    tasks/
      celery_app.py
      ingestion_tasks.py
      analysis_tasks.py
      report_tasks.py
    schemas/
      auth.py
      campaign.py
      source.py
      insight.py
      report.py
      outreach.py
    services/
      email_service.py
    utils/
      hashing.py
      retry.py
      time.py

  tasks/
    celery_worker.py
    reddit_scraper.py
    nlp_analysis.py
```

## File Responsibilities (Short)

### Entry + API
- `app/main.py`: FastAPI entrypoint, middleware setup, router registration.
- `app/api/deps.py`: shared dependencies (`get_db`, auth dependencies, pagination).
- `app/api/routers/auth.py`: authentication and user account routes.
- `app/api/routers/campaigns.py`: campaign CRUD and campaign run triggers.
- `app/api/routers/keywords.py`: keyword management and keyword-level stats routes.
- `app/api/routers/sources.py`: source sync status, source refresh triggers, source health.
- `app/api/routers/insights.py`: analysis endpoints (posts, sentiment, pain points, competitors).
- `app/api/routers/reports.py`: report generation and report retrieval endpoints.
- `app/api/routers/outreach.py`: outreach candidate list, status updates, draft generation.

### Core
- `app/core/config.py`: environment config, feature flags, source credentials, thresholds.
- `app/core/security.py`: JWT helpers and password/security utilities.
- `app/core/logging.py`: structured logs and request/task correlation IDs.

### DB Foundation
- `app/db/session.py`: SQLAlchemy engine/session factory.
- `app/db/base.py`: declarative base and model imports for metadata.

### Models
- `app/db/models/user.py`: user account model.
- `app/db/models/campaign.py`: campaign metadata and lifecycle status.
- `app/db/models/keyword.py`: campaign keywords.
- `app/db/models/source_config.py`: source selection, sync state, cursor, quotas.
- `app/db/models/raw_item.py`: immutable source payloads + source identifiers.
- `app/db/models/normalized_item.py`: canonical cross-source text record.
- `app/db/models/analysis_item.py`: relevance, sentiment, pain points, intent outputs.
- `app/db/models/competitor.py`: discovered competitor entities.
- `app/db/models/competitor_evidence.py`: evidence linked to competitors.
- `app/db/models/scorecard.py`: per-category scores and total validation score.
- `app/db/models/report_snapshot.py`: finalized report versions with citations.
- `app/db/models/outreach_candidate.py`: ranked outreach leads.
- `app/db/models/outreach_action.py`: outreach workflow actions/statuses.
- `app/db/models/pipeline_run.py`: run-level trace for ingestion/analysis/report generation.

### Repositories
- `app/db/repositories/user_repo.py`: user data access helpers.
- `app/db/repositories/campaign_repo.py`: campaign CRUD and status transitions.
- `app/db/repositories/source_repo.py`: source sync and cursor persistence.
- `app/db/repositories/ingestion_repo.py`: raw and normalized evidence writes.
- `app/db/repositories/analysis_repo.py`: analysis read/write operations.
- `app/db/repositories/competitor_repo.py`: competitor entity and evidence operations.
- `app/db/repositories/scoring_repo.py`: scorecard persistence and fetch.
- `app/db/repositories/report_repo.py`: report snapshot persistence and retrieval.
- `app/db/repositories/outreach_repo.py`: outreach candidate/action persistence.

### Ingestion
- `app/ingestion/contracts.py`: typed internal contracts for raw and normalized records.
- `app/ingestion/registry.py`: source-to-adapter registry.
- `app/ingestion/orchestrator.py`: orchestrates per-source ingestion and stage transitions.
- `app/ingestion/merge/canonicalize.py`: unify fields into canonical schema.
- `app/ingestion/merge/dedup.py`: exact and near-duplicate removal.
- `app/ingestion/merge/entity_resolution.py`: map aliases to same product/competitor entity.

### Source Adapters (pattern repeated for each source)
- `client.py`: API client/session, auth, retries, pagination.
- `extractor.py`: fetch raw records from source APIs.
- `normalizer.py`: map source response into canonical fields.

### Analysis
- `app/analysis/relevance.py`: relevance scoring against campaign description/keywords.
- `app/analysis/sentiment.py`: sentiment model wrappers and score normalization.
- `app/analysis/pain_points.py`: pain-point phrase extraction and grouping.
- `app/analysis/intent.py`: classify intent signals (problem-seeking, switch intent, buying intent).
- `app/analysis/competitor_intel.py`: strengths/weaknesses and competitor mention extraction.
- `app/analysis/category_metrics.py`: compute category metrics (Demand, Pain, etc.).
- `app/analysis/scoring.py`: weighted score calculation out of 100.
- `app/analysis/confidence.py`: confidence score from coverage, recency, sample size, agreement.

### Reporting
- `app/reporting/builder.py`: assemble final report payload from score + evidence + metrics.
- `app/reporting/serializers/report_json.py`: JSON response serializer.
- `app/reporting/serializers/report_markdown.py`: markdown report export serializer.

### Outreach
- `app/outreach/candidate_selector.py`: select potential outreach targets from analyzed evidence.
- `app/outreach/ranker.py`: rank candidates by pain, relevance, recency, engagement.
- `app/outreach/message_drafts.py`: generate safe outreach draft messages.

### Tasks
- `app/tasks/celery_app.py`: Celery app config and task registration.
- `app/tasks/ingestion_tasks.py`: queued source ingestion tasks.
- `app/tasks/analysis_tasks.py`: queued analysis/scoring tasks.
- `app/tasks/report_tasks.py`: queued report generation tasks.

### Schemas
- `app/schemas/auth.py`: auth request/response schemas.
- `app/schemas/campaign.py`: campaign and keyword schemas.
- `app/schemas/source.py`: source sync and status schemas.
- `app/schemas/insight.py`: posts, sentiment, pain points, competitor insights schemas.
- `app/schemas/report.py`: scorecard and final report schemas.
- `app/schemas/outreach.py`: outreach candidate and action schemas.

### Services + Utils
- `app/services/email_service.py`: email notifications (existing service).
- `app/utils/hashing.py`: stable content hash helpers.
- `app/utils/retry.py`: retry/backoff utility helpers.
- `app/utils/time.py`: UTC/time-window helpers.

### Compatibility Layer (current structure support)
- `tasks/celery_worker.py`: compatibility import wrapper to `app/tasks/celery_app.py`.
- `tasks/reddit_scraper.py`: compatibility wrapper to new Reddit adapter/orchestrator task.
- `tasks/nlp_analysis.py`: compatibility wrapper to new analysis task entrypoints.

## End-to-End Data Flow to Final Validation Report

1. Campaign creation
- Client creates campaign via `/campaigns`.
- Campaign, keywords, selected sources are stored.
- A `pipeline_run` record is opened.

2. Source ingestion
- Orchestrator schedules source-specific tasks in parallel.
- Each source extractor fetches records and writes them to `raw_item`.

3. Normalization and merge
- Source normalizers map raw payloads to canonical fields in `normalized_item`.
- Dedup and entity resolution merge overlapping records.

4. Analysis stage
- Relevance, sentiment, pain points, intent, and competitor signals are computed.
- Results are persisted in `analysis_item` and competitor evidence tables.

5. Scoring stage
- Category metrics are computed from analyzed evidence.
- Weighted score engine computes final Validation Score (0-100).
- Confidence engine computes Confidence Score.
- Both are stored in `scorecard`.

6. Report stage
- Report builder assembles summary, metrics, scores, and citations.
- Report is stored as `report_snapshot`.
- API returns latest snapshot to frontend report page.

7. Outreach stage
- Outreach selector/ranker generates candidate list from analyzed evidence.
- Candidate list and draft messages are stored and served to outreach UI.

## Collective Pipeline View

```text
Campaign + Keywords
    -> Source Tasks (parallel)
    -> Raw Items
    -> Normalized Items
    -> Merge (dedup + entities)
    -> Analysis Items
    -> Category Metrics
    -> Validation Score + Confidence
    -> Report Snapshot (with citations)
    -> Outreach Candidates + Drafts
```

## Why This Structure Works
- Keeps source-specific logic isolated and easy to extend.
- Preserves traceability from report claim back to raw evidence.
- Supports async scaling with Celery.
- Allows gradual migration from current files without breaking existing endpoints.
