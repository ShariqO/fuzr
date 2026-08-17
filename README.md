# FUZR — AI-Powered Sales Intelligence Platform

> Identifies and ranks your most promising B2B prospects by ingesting real-time data from 10+ external sources, extracting buying signals with GPT-4o, and scoring companies using a hybrid rule-based + semantic similarity engine.

**Live Demo**: Deployed on Vercel  
**Tech Stack**: Next.js 14 · TypeScript · Tailwind CSS · Supabase (PostgreSQL + pgvector + Auth) · OpenAI (GPT-4o, GPT-4o-mini, text-embedding-3-small) · Zod

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA INGESTION                          │
│  Companies House · Adzuna · RapidAPI (3 job APIs) · NewsAPI    │
│  Google News RSS · FCA Register · Hunter.io · Web Scraper      │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI SIGNAL EXTRACTION                        │
│  GPT-4o extracts structured buying signals from unstructured   │
│  text (news, scraped pages) with Zod-validated JSON output     │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              STORAGE & VECTOR EMBEDDINGS                       │
│  Supabase PostgreSQL + pgvector (1536d, ivfflat indexes)       │
│  Companies, signals, and profiles all have vector embeddings   │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌──────────────────────┬──────────────────────────────────────────┐
│   SCORING ENGINE     │         RAG RETRIEVAL                   │
│  Rule-based ICP fit  │  pgvector semantic search via RPC       │
│  + embedding cosine  │  Cross-company pattern detection        │
│  similarity scoring  │  Contextual prompt augmentation         │
└──────────┬───────────┴──────────────┬───────────────────────────┘
           ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI GENERATION                             │
│  Signal analysis · Pain point detection · Outreach emails      │
│  Industry trends · Company insights · Sales assistant chat     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### Data Enrichment Pipeline
- **10+ live API integrations** aggregating company data, hiring trends, regulatory status, news, and contacts in real time
- **Web scraper** extracts tech stack signatures, careers page data, and AI-derived signals from company websites
- **Multi-source deduplication** — 3-phase pipeline (normalized text, word-overlap similarity, cross-type topic detection) prevents duplicate signals

### AI / LLM Integration
- **GPT-4o** extracts structured buying signals (type, evidence, confidence, date) from unstructured news and website content, validated with Zod schemas
- **GPT-4o-mini** powers 6 features: personalized signal analysis, pain point detection, outreach email generation, industry trend forecasting, company insights, and an interactive sales assistant
- **text-embedding-3-small** generates 1536-dimensional vector embeddings for companies, user profiles, and signals

### RAG (Retrieval-Augmented Generation)
- **pgvector** with ivfflat cosine similarity indexes on companies, profiles, and signals
- **3 Supabase RPC functions** for semantic search: `match_signals`, `match_companies`, `match_signals_cross_company`
- **Cross-company pattern detection** — when analyzing a signal, RAG retrieves similar patterns from other companies to provide market-level context
- **Graceful fallback** — if embeddings are unavailable, falls back to text-based retrieval

### Scoring Engine (Hybrid)
- **Base Fit** (0–60 pts): Industry match, company size band, buyer persona plausibility
- **Signal Boost** (0–30 pts): Recency-weighted signals with category relevance multipliers
- **Semantic Similarity** (0–20 pts): Cosine distance between user profile embedding and company embedding
- **Confidence Score** (0–100): Derived from score, signal count, recency, and semantic match strength
- Every recommendation includes evidence-backed explanations and pitch angle suggestions

### Frontend
- **Dashboard** with sortable/filterable recommendation table, confidence indicators, and score breakdowns
- **Company detail pages** with expandable AI-powered signal cards, on-demand analysis, and export (CSV/JSON)
- **Outreach assistant** — conversational AI sales co-pilot with live company research
- **Watchlist** for tracking high-priority prospects
- Full auth flow (sign up, sign in, protected routes) via Supabase Auth

---

## External Data Sources

| Source | Data Retrieved | Integration |
|--------|---------------|-------------|
| Companies House API | Company profiles, SIC codes, registration status | REST API |
| Adzuna Jobs API | Hiring volume, job categories, hiring trends | REST API |
| RapidAPI — JSearch | Job postings, tech stack signals | REST API |
| RapidAPI — LinkedIn Jobs | Role-specific hiring data | REST API |
| RapidAPI — ActiveJobsDB | Additional job market intelligence | REST API |
| NewsAPI | Company news articles, industry coverage | REST API |
| Google News RSS | Supplementary news feed | RSS/XML |
| FCA Register | UK financial regulatory status, authorization | REST API |
| Hunter.io | Employee contacts, email addresses, seniority data | REST API |
| OpenAI API | GPT-4o/mini chat completions, text embeddings | SDK |
| Company Websites | Tech stack, careers pages, structured data (JSON-LD) | Web scraping |

---

## Project Structure

```
fuzr/
├── app/
│   ├── api/
│   │   ├── analyze/                    # Company analysis endpoint
│   │   ├── cleanup-duplicates/         # Signal deduplication endpoint
│   │   ├── companies/
│   │   │   ├── [id]/refresh-signals/   # Re-enrichment pipeline trigger
│   │   │   └── search/                 # Company search
│   │   ├── company-insights/           # AI company insights (GPT-4o-mini)
│   │   ├── diagnostics/               # System health & API status
│   │   ├── industry-trends/            # AI industry trend analysis
│   │   ├── outreach-assistant/         # AI sales assistant chat
│   │   ├── recommendations/generate/   # Scoring engine trigger
│   │   ├── sales-assistant/            # Pain points, emails, contacts
│   │   ├── signal-analysis/            # AI signal deep-dive (RAG-enhanced)
│   │   └── watchlist/                  # Watchlist CRUD
│   ├── auth/                           # Sign in / Sign up
│   ├── company/[id]/                   # Company detail page
│   ├── dashboard/                      # Main dashboard
│   ├── onboarding/                     # ICP profile setup
│   ├── outreach-assistant/             # Sales assistant UI
│   └── watched/                        # Watchlist page
├── db/
│   └── migrations/                     # 6 SQL migrations (schema + pgvector + RAG)
├── lib/
│   ├── ai/
│   │   ├── embeddings.ts               # OpenAI embedding generation + cosine similarity
│   │   ├── openai-client.ts            # OpenAI client singleton
│   │   ├── rag.ts                      # RAG retrieval module (vector search + context)
│   │   ├── sales-assistant.ts          # Pain points, outreach, contacts, trends
│   │   └── signal-extractor.ts         # GPT-4o structured signal extraction (Zod)
│   ├── data-sources/
│   │   ├── adzuna.ts                   # Adzuna Jobs API client
│   │   ├── companies-house.ts          # Companies House API client
│   │   ├── fca-lookup.ts               # FCA Register lookup
│   │   ├── fca-register.ts             # FCA direct API client
│   │   ├── hunter.ts                   # Hunter.io contacts API
│   │   ├── news-feed.ts               # Google News RSS parser
│   │   ├── newsapi.ts                  # NewsAPI client
│   │   └── rapidapi-jobs.ts            # RapidAPI multi-source job search
│   ├── enrichment/
│   │   └── web-scraper.ts              # Company website scraper
│   ├── pipeline/
│   │   └── company-enricher.ts         # Orchestration: enrichment + signal pipeline
│   ├── scoring-engine.ts               # Hybrid recommendation engine
│   └── supabase/                       # Supabase client config (server + client)
├── scripts/
│   ├── backfill-signal-embeddings.ts   # Batch embed existing signals
│   ├── seed.js                         # Database seeder
│   └── migrate.js                      # Migration runner
└── types/
    ├── database.ts                     # Supabase-generated TypeScript types
    └── schema.ts                       # Zod validation schemas
```

---

## Database Schema

Built on Supabase PostgreSQL with pgvector extension:

| Table | Key Columns | Notes |
|-------|------------|-------|
| `profiles` | ICP fields, `selling_embedding vector(1536)` | User targeting preferences + vector |
| `companies` | Name, industry, size, `embedding vector(1536)` | Enriched company data + vector |
| `signals` | Type, evidence, confidence, `embedding vector(1536)` | Buying signals with vectors for RAG |
| `recommendations` | Score, confidence, explanation, pitch angle | Generated prospect rankings |
| `watched_companies` | User watchlist associations | Prospect tracking |

**Row Level Security** enabled on all tables. All data access is scoped to the authenticated user.

**Vector indexes** (ivfflat, cosine similarity) on `companies.embedding`, `profiles.selling_embedding`, and `signals.embedding`.

**3 RPC functions** for semantic search: `match_signals`, `match_companies`, `match_signals_cross_company`.

---

## Signal Types

The platform identifies and categorizes 7 buying signal types:

| Signal Type | What It Indicates |
|-------------|-------------------|
| Hiring Spike (role-specific) | Rapid team expansion, new department formation |
| Cloud Migration / Modernization | Infrastructure transformation, digital initiatives |
| Security / Compliance Pressure | Regulatory requirements, audit preparation |
| Cost Cutting / Vendor Consolidation | Budget optimization, vendor rationalization |
| Expansion / New Market | Geographic expansion, acquisitions, growth |
| Data Platform Build-out | Analytics infrastructure, data warehousing |
| Tooling Refresh / Stack Change | Legacy system replacement, new technology adoption |

---

## Scoring Algorithm

### Base Fit (0–60 points)
- **Industry Match** (0–25): Exact match = 25, related industry = 10
- **Size Band Match** (0–20): Target range = 20, adjacent = partial credit
- **Persona Plausibility** (0–15): Company size + role complexity heuristic

### Signal Boost (0–30 points)
- Weighted by recency: 0–90 days (1.0×), 91–180 days (0.7×), 180+ days (0.4×)
- Category-relevant signals receive a 2× multiplier
- Cost-cutting signals penalized 0.5× unless selling efficiency solutions

### Semantic Similarity (0–20 points)
- Cosine similarity between user `selling_embedding` and company `embedding`
- Sigmoid-normalized boost: >0.7 similarity = significant points, <0.5 = minimal

### Confidence Score (0–100)
- Base score contribution (up to 60%)
- Signal evidence count (up to 15%)
- Recent signal recency (up to 15%)
- Semantic match presence (+10%)

---

## Getting Started

### Prerequisites
- Node.js 18+
- [Supabase](https://supabase.com) account (free tier works)
- [OpenAI API key](https://platform.openai.com/) (for AI features)

### Setup

```bash
# Clone and install
git clone https://github.com/ShariqO/fuzr.git
cd fuzr
npm install

# Configure environment
cp .env.example .env.local
```

Required environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key
```

Optional API keys for data enrichment:
```
COMPANIES_HOUSE_API_KEY=       # Company profiles
ADZUNA_APP_ID=                 # Job market data
ADZUNA_APP_KEY=
RAPIDAPI_KEY=                  # Multi-source job search
NEWSAPI_KEY=                   # News articles
HUNTER_API_KEY=                # Contact data
```

### Run Migrations

Run each SQL file in order via the Supabase SQL Editor:
1. `db/migrations/001_initial_schema.sql`
2. `db/migrations/002_seed_policies.sql`
3. `db/migrations/003_add_vectors.sql`
4. `db/migrations/004_watched_companies.sql`
5. `db/migrations/005_add_employment_status.sql`
6. `db/migrations/006_rag_infrastructure.sql`

### Start Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Security

- **Row Level Security (RLS)** on all Supabase tables
- **Supabase Auth** with session-based authentication
- **Protected API routes** — all endpoints verify the authenticated user
- **Rate limiting** — 10 recommendation generations per hour per user
- **No secrets in repo** — all credentials via environment variables

---

## Built With

| Technology | Usage |
|-----------|-------|
| **Next.js 14** | Full-stack React framework (App Router, Server Components) |
| **TypeScript** | End-to-end type safety |
| **Tailwind CSS** | Utility-first styling |
| **Supabase** | PostgreSQL database, Auth, pgvector, RPC functions |
| **OpenAI** | GPT-4o (signal extraction), GPT-4o-mini (6 AI features), text-embedding-3-small |
| **pgvector** | Vector similarity search for RAG |
| **Zod** | Runtime schema validation for API responses and LLM output |

---

## License

MIT License
