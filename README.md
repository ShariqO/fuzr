# FUZR

A B2B sales intelligence tool. It ingests company data from 10+ external sources, uses GPT-4o to pull buying signals out of unstructured text, and ranks prospects with a hybrid rule-based and semantic similarity score.

Built over three months in late 2025 and submitted to Y Combinator. Not actively developed.

**Stack:** Next.js 14 · TypeScript · Tailwind · Supabase (PostgreSQL, pgvector, Auth) · OpenAI (GPT-4o, GPT-4o-mini, text-embedding-3-small) · Zod

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA INGESTION                           │
│  Companies House · Adzuna · RapidAPI (3 job APIs) · NewsAPI     │
│  Google News RSS · FCA Register · Hunter.io · Web Scraper       │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI SIGNAL EXTRACTION                         │
│  GPT-4o extracts structured buying signals from unstructured    │
│  text (news, scraped pages) with Zod-validated JSON output      │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              STORAGE & VECTOR EMBEDDINGS                        │
│  Supabase PostgreSQL + pgvector (1536d, ivfflat indexes)        │
│  Companies, signals, and profiles all have vector embeddings    │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌──────────────────────┬──────────────────────────────────────────┐
│   SCORING ENGINE     │         RAG RETRIEVAL                    │
│  Rule-based ICP fit  │  pgvector semantic search via RPC        │
│  + embedding cosine  │  Cross-company pattern detection         │
│  similarity scoring  │  Contextual prompt augmentation          │
└──────────┬───────────┴──────────────┬───────────────────────────┘
           ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI GENERATION                              │
│  Signal analysis · Pain point detection · Outreach emails       │
│  Industry trends · Company insights · Sales assistant chat      │
└─────────────────────────────────────────────────────────────────┘
```

## How it works

**Enrichment.** Ten live API integrations pull company profiles, hiring trends, regulatory status, news, and contacts. A scraper picks up tech stack signatures, careers page data, and structured JSON-LD from company sites. A three-phase deduplication step (normalised text, word-overlap similarity, cross-type topic detection) stops the same signal landing twice from different sources.

**Signal extraction.** GPT-4o reads news articles and scraped pages and returns structured signals, type, evidence, confidence, date, validated against Zod schemas so malformed model output fails loudly rather than silently corrupting the database. GPT-4o-mini handles six lighter features: signal analysis, pain point detection, outreach email drafting, industry trend forecasting, company insights, and the sales assistant chat.

**Retrieval.** Companies, profiles, and signals all carry 1536-dimensional embeddings with ivfflat cosine indexes. Three Supabase RPC functions (`match_signals`, `match_companies`, `match_signals_cross_company`) handle semantic search. When analysing a signal, the system retrieves similar patterns from other companies so the model has market-level context rather than just the single data point. If embeddings aren't available it falls back to text retrieval.

**Scoring.** A prospect's score is the sum of three parts:

- *Base fit* (0–60): industry match, company size band, buyer persona plausibility
- *Signal boost* (0–30): recency-weighted, with category relevance multipliers
- *Semantic similarity* (0–20): cosine distance between the user's profile embedding and the company embedding

A separate confidence score (0–100) is derived from the score, signal count, recency, and semantic match strength. Every recommendation comes with evidence and a suggested pitch angle.

## Scoring detail

Base fit breaks down as industry match (0–25, exact is 25, related is 10), size band match (0–20, target range is 20, adjacent gets partial credit), and persona plausibility (0–15, a heuristic on company size and role complexity).

Signal boost weights by recency: 0–90 days at 1.0×, 91–180 at 0.7×, beyond 180 at 0.4×. Category-relevant signals get 2×. Cost-cutting signals are penalised at 0.5× unless the user is selling efficiency solutions.

Semantic similarity is sigmoid-normalised, so above 0.7 contributes meaningfully and below 0.5 contributes almost nothing.

## Signal types

| Type | What it suggests |
|---|---|
| Hiring spike (role-specific) | Team expansion, new department |
| Cloud migration / modernisation | Infrastructure transformation |
| Security / compliance pressure | Regulatory requirements, audit prep |
| Cost cutting / vendor consolidation | Budget optimisation |
| Expansion / new market | Geographic growth, acquisitions |
| Data platform build-out | Analytics infrastructure |
| Tooling refresh / stack change | Legacy replacement |

## Data sources

| Source | Data | Integration |
|---|---|---|
| Companies House | Company profiles, SIC codes, registration status | REST |
| Adzuna Jobs | Hiring volume, categories, trends | REST |
| RapidAPI, JSearch | Job postings, tech stack signals | REST |
| RapidAPI, LinkedIn Jobs | Role-specific hiring data | REST |
| RapidAPI, ActiveJobsDB | Additional job market data | REST |
| NewsAPI | Company news, industry coverage | REST |
| Google News RSS | Supplementary news feed | RSS |
| FCA Register | UK financial regulatory status | REST |
| Hunter.io | Contacts, emails, seniority | REST |
| OpenAI | Completions and embeddings | SDK |
| Company websites | Tech stack, careers pages, JSON-LD | Scraper |

## Database

Supabase PostgreSQL with pgvector.

| Table | Key columns |
|---|---|
| `profiles` | ICP fields, `selling_embedding vector(1536)` |
| `companies` | Name, industry, size, `embedding vector(1536)` |
| `signals` | Type, evidence, confidence, `embedding vector(1536)` |
| `recommendations` | Score, confidence, explanation, pitch angle |
| `watched_companies` | Watchlist associations |

Row Level Security is on for every table and all access is scoped to the authenticated user. Vector indexes are ivfflat with cosine similarity.

## Running it

Needs Node 18+, a Supabase project, and an OpenAI key.

```bash
git clone https://github.com/ShariqO/fuzr.git
cd fuzr
npm install
cp .env.example .env.local
```

Required:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
```

Optional, for enrichment:

```
COMPANIES_HOUSE_API_KEY=
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
RAPIDAPI_KEY=
NEWSAPI_KEY=
HUNTER_API_KEY=
```

Run the migrations in `db/migrations/` in order through the Supabase SQL editor, then:

```bash
npm run dev
```

## Security

RLS on all tables, Supabase session auth, every API route verifies the authenticated user, rate limiting at 10 recommendation generations per hour per user, and no credentials in the repo.

## Project structure

```
fuzr/
├── app/
│   ├── api/              # analysis, enrichment, recommendations, assistant, watchlist
│   ├── auth/
│   ├── company/[id]/
│   ├── dashboard/
│   ├── onboarding/       # ICP profile setup
│   └── watched/
├── db/migrations/        # 6 SQL migrations (schema, pgvector, RAG)
├── lib/
│   ├── ai/               # embeddings, RAG, signal extraction, sales assistant
│   ├── data-sources/     # one client per external API
│   ├── enrichment/       # web scraper
│   ├── pipeline/         # enrichment orchestration
│   ├── scoring-engine.ts
│   └── supabase/
├── scripts/              # backfill, seed, migrate
└── types/                # generated DB types, Zod schemas
```

## License

MIT.
