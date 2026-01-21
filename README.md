# DealSignals MVP

> AI-powered sales intelligence platform that identifies and ranks your most promising prospects based on real-time signals and ICP fit.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account (free tier works)

### Setup Instructions

1. **Clone and Install**

```bash
cd dealsignals
npm install
```

2. **Set Up Supabase**

   - Create a new project at [app.supabase.com](https://app.supabase.com)
   - Go to Settings → API to get your credentials
   - Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Run Database Migrations**

   Open your Supabase project dashboard, go to the SQL Editor, and run the SQL from:
   `db/migrations/001_initial_schema.sql`

   This creates all required tables with Row Level Security policies.

4. **Seed the Database**

```bash
npm run db:seed
```

This will populate your database with 150 mock UK companies and 2-6 signals per company.

5. **Start the Development Server**

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📊 Features

### Implemented

✅ **Landing Page** - Product pitch with clear CTA  
✅ **Authentication** - Email/password sign up and sign in via Supabase Auth  
✅ **Protected Routes** - Middleware-based session management  
✅ **Onboarding Flow** - Comprehensive profile form with ICP definition  
✅ **Recommendation Engine** - Deterministic scoring with explainability  
✅ **Dashboard** - View top 20 recommendations with filters  
✅ **Company Detail** - Deep dive into signals and match reasoning  
✅ **CSV Export** - Download recommendations for your CRM  
✅ **JSON Export** - Export individual company summaries  
✅ **Rate Limiting** - 10 generations per hour per user  

### Onboarding Profile Fields

- Full name
- Role (Sales Manager / AE / RevOps / Other)
- Region (default: UK)
- Selling category (CRM, Data/AI, Cybersecurity, Cloud, DevOps, FinTech, HRTech, MarTech, Other)
- Selling description (free text, min 10 chars)
- Target industries (multi-select from 14 industries)
- Target size bands (1-50, 51-200, 201-1000, 1001-5000, 5000+)
- Buyer personas (CTO, CIO, CISO, Head of Data, RevOps, VP Eng, Finance, HR)
- Optional: Deal size range (min/max in £)

### Signal Types Taxonomy

The platform tracks 7 distinct signal types:

1. **Hiring Spike (role-specific)** - Rapid team expansion
2. **Cloud Migration / Modernization** - Infrastructure transformation
3. **Security / Compliance Pressure** - Regulatory requirements
4. **Cost Cutting / Vendor Consolidation** - Budget optimization
5. **Expansion / New Market** - Growth initiatives
6. **Data Platform Build-out** - Data infrastructure projects
7. **Tooling Refresh / Stack Change** - Technology upgrades

## 🧮 Scoring Algorithm

### Base Fit Score (0-60 points)

- **Industry Match** (0-25): Perfect match = 25, related = 10
- **Size Band Match** (0-20): In target range = 20, otherwise 0
- **Persona Plausibility** (0-15): Company size + specialized roles heuristic

### Signal Boost (0-40 points)

Signals are weighted by recency:
- **0-90 days**: 1.0x weight
- **91-180 days**: 0.7x weight
- **180+ days**: 0.4x weight

Signals matching your selling category get a 1.5x multiplier.

**Special rule**: "Cost Cutting / Vendor Consolidation" signals receive a 0.5x penalty unless you're selling Cloud or DevOps (efficiency plays).

### Confidence Score (0-100)

Calculated from:
- Base score contribution (up to 60%)
- Evidence count (up to 20%)
- Recent signal count (up to 20%)

### Explainability

Every recommendation includes:
- 3-5 specific bullet reasons anchored to signals or profile matches
- Pitch angle suggestion based on selling category + signal type
- Full scoring breakdown (base fit + signal boost)
- No generic AI-generated fluff—only evidence-backed claims

## 📁 Project Structure

```
dealsignals/
├── app/
│   ├── api/
│   │   └── recommendations/
│   │       └── generate/          # Recommendation generation endpoint
│   ├── auth/
│   │   ├── signin/                # Sign-in page
│   │   └── signup/                # Sign-up page
│   ├── company/[id]/              # Company detail page
│   ├── dashboard/                 # Main dashboard
│   ├── onboarding/                # Profile setup
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Landing page
├── components/                    # Reusable UI components (future)
├── db/
│   └── migrations/                # SQL migration files
├── lib/
│   ├── supabase/                  # Supabase client configs
│   ├── scoring-engine.ts          # Recommendation algorithm
│   └── rate-limiter.ts            # Rate limiting logic
├── scripts/
│   ├── migrate.js                 # Migration runner
│   └── seed.js                    # Database seeding
├── types/
│   ├── database.ts                # TypeScript database types
│   └── schema.ts                  # Zod validation schemas
├── .env.example                   # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## 🔐 Security

- **Row Level Security (RLS)** enabled on all tables
- Users can only access their own profiles and recommendations
- All users can read companies and signals (demo data)
- Protected API routes require authentication
- Rate limiting prevents abuse
- No secrets in repo (use `.env.local`)

## 🗄️ Database Schema

### Tables

**profiles** - User ICP configuration  
**companies** - 150 seeded UK companies  
**signals** - 300-900 buying signals  
**recommendations** - Generated prospect rankings  

All tables use UUID primary keys and timestamps. See `db/migrations/001_initial_schema.sql` for full schema.

## 📜 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run db:migrate   # Run database migrations (manual via SQL editor recommended)
npm run db:seed      # Seed database with mock data
```

## 🎯 User Journey (End-to-End)

1. Visit landing page → Click "Get Started Free"
2. Sign up with email/password
3. Complete onboarding profile (ICP definition)
4. Redirected to dashboard
5. Click "Generate Recommendations"
6. View top 20 ranked prospects with confidence scores
7. Apply filters (industry, size, confidence threshold)
8. Click "View Details" on a company
9. See signals, match explanation, scoring breakdown
10. Export CSV (all recommendations) or JSON (single company)

## 🚧 Production Considerations

This is an MVP. For production:

- **Rate Limiting**: Replace in-memory store with Redis
- **Migrations**: Use a proper migration tool (e.g., Supabase CLI or db-migrate)
- **Monitoring**: Add logging, error tracking (Sentry), and analytics
- **Data**: Integrate real data providers (requires compliance review)
- **Embeddings**: Implement optional OpenAI similarity (requires `OPENAI_API_KEY`)
- **Tests**: Add unit tests for scoring engine and E2E tests
- **CI/CD**: Set up automated testing and deployment
- **Auth**: Add email verification, password reset, OAuth providers

## 🧪 Testing Locally

After setup:
1. Sign up with a test email
2. Complete onboarding (try selecting "Cybersecurity" as category)
3. Generate recommendations
4. Filter by "Financial Services" industry
5. Click into a company with "Security / Compliance Pressure" signals
6. Export both CSV and JSON to verify formats

## 🔒 Assumptions & Constraints

### Data
- **Mock data only** - No real company data or web scraping
- **UK focus** - All 150 companies are UK-based
- **Static signals** - Signals are seeded, not updated in real-time (MVP limitation)
- **No external APIs** - Everything runs locally after initial Supabase setup

### Scoring
- **Deterministic** - Same profile + same data = same results
- **Rule-based** - No machine learning (explainability priority)
- **Simple persona mapping** - Company size heuristics, not role-level data

### Auth & Security
- **Email/password only** - No OAuth (Google, etc.) in MVP
- **No email verification** - Disabled for local testing simplicity
- **In-memory rate limit** - Resets on server restart

### Scale
- **150 companies** - Sufficient for demo, not production scale
- **Single user seed** - Each user generates their own recommendations
- **No caching** - Recommendations regenerated each time (can be optimized)

## 📖 Scoring Example

**Profile**: Selling Cybersecurity to Financial Services companies (201-1000 employees) targeting CISOs

**Company**: "SecureBank Solutions" (Financial Services, 501-1000, London)

**Signals**:
1. "Must achieve ISO 27001 by Q2" (Security/Compliance, 45 days ago) → High relevance
2. "Hiring 2 Security Analysts" (Hiring Spike, 60 days ago) → Medium relevance

**Scoring**:
- Industry match: +25 (perfect match)
- Size match: +20 (in range)
- Persona plausibility: +15 (large company, CISO exists)
- **Base Fit**: 60/60

- Signal 1: 5 × 1.0 (recent) × 1.5 (category match) = 7.5
- Signal 2: 5 × 1.0 (recent) × 1.0 = 5.0
- **Signal Boost**: 12.5/40

**Total Score**: 72.5 → Rounded to 73  
**Confidence**: ~85% (high base fit + 2 recent signals)

**Pitch Angle**: "Perfect timing to discuss how our security solution addresses their compliance needs"

## 🤝 Contributing

This is an MVP demo. Contributions welcome! Suggested improvements:
- Add comprehensive test coverage
- Implement real-time signal updates
- Add email notifications for new high-confidence matches
- Build Chrome extension for LinkedIn enrichment (respecting ToS)
- Add collaborative features (team workspaces)

## 📄 License

MIT License - Free to use and modify.

---

**Built with**: Next.js 14, TypeScript, Tailwind CSS, Supabase, Zod  
**Author**: AI-assisted development for modern sales teams  
**Version**: 1.0.0 (MVP)
# fuzr
