# Axo Lab Analyzer

An AI-powered biomarker extraction and analysis tool built for the Axo Longevity platform. Upload any lab report PDF in any language and the app extracts every biomarker, standardizes names and units into English, and classifies each result against both standard lab reference ranges and evidence-based longevity-optimal thresholds adjusted for the patient's age and sex.

---

## Live Demo

> [medical-report-analysis-dusky.vercel.app/](https://medical-report-analysis-dusky.vercel.app/)

---

## Features

- **Universal PDF support** — any lab format, any language (Spanish, French, German, etc.)
- **Full biomarker extraction** — every measurable value on the report, nothing skipped
- **Dual classification system** — lab reference range _and_ longevity-optimal range side by side
- **Age and sex adjusted** — optimal thresholds shift based on the patient demographics parsed directly from the report
- **Expandable rows** — click any biomarker to see the visual range bar, exact range values, and a one-sentence clinical insight
- **Category filtering** — drill into Lipid Panel, CBC, Metabolic Panel, and more
- **Status filtering** — quickly surface only out-of-range or non-optimal results
- **Longevity score ring** — percentage of biomarkers within optimal range at a glance
- **Light / dark mode** — persisted to localStorage, respects OS preference on first visit
- **Responsive** — sidebar layout on desktop, chip filters and drawer on mobile
- **Retry logic** — automatic exponential backoff on API overload (529) errors

---

## Tech Stack

| Layer     | Technology              | Purpose                                        |
| --------- | ----------------------- | ---------------------------------------------- |
| Framework | Next.js 14 (App Router) | Full-stack React framework                     |
| Language  | TypeScript              | Type safety across frontend and backend        |
| Styling   | Tailwind CSS v4         | Utility-first styling with dark mode           |
| AI        | Anthropic Claude API    | PDF extraction, classification, clinical notes |
| HTTP      | Next.js Route Handlers  | Serverless API endpoints                       |

---

## Project Structure

```
axo-lab-analyzer/
│
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts          # POST /api/analyze — HTTP validation, delegates to lib/claude.ts
│   │
│   ├── components/
│   │   ├── BiomarkerRow.tsx      # Single expandable table row with range bar and clinical note
│   │   ├── BiomarkerTable.tsx    # Main results view — orchestrates sidebar and table
│   │   ├── RangeBar.tsx          # SVG range visualization (lab range vs optimal range vs value)
│   │   ├── Sidebar.tsx           # Patient card, score ring, summary stats, category filters
│   │   ├── StatusBadge.tsx       # Colored pill badge (Optimal / Normal / Out of Range)
│   │   ├── ThemeProvider.tsx     # React context for light/dark theme state
│   │   ├── ThemeToggle.tsx       # Sun/moon icon button in the header
│   │   └── UploadZone.tsx        # Drag-and-drop PDF upload area
│   │
│   ├── hooks/
│   │   └── useAnalyze.ts         # State machine and file upload logic (idle → loading → result)
│   │
│   ├── globals.css               # Tailwind v4 entry, @theme tokens, dark mode variant
│   ├── layout.tsx                # Root layout with ThemeProvider and Google Fonts
│   └── page.tsx                  # Top-level page — renders upload, loading, or results view
│
├── lib/
│   ├── anthropic.ts              # Singleton Anthropic SDK client
│   ├── claude.ts                 # Claude API call, retry loop, JSON extraction and parsing
│   ├── prompt.ts                 # System prompt — extraction rules, classification logic, output schema
│   └── types.ts                  # TypeScript interfaces: LabReport, Biomarker, Patient, etc.
│
├── .env.local.example            # Environment variable template
├── postcss.config.mjs            # PostCSS config for Tailwind v4
└── README.md
```

---

## How It Works

### Pipeline

```
User uploads PDF
       │
       ▼
Next.js Route Handler (/api/analyze)
  └── Validates file (type, size)
  └── Encodes PDF as base64
       │
       ▼
lib/claude.ts — analyzeLabReport()
  └── callClaude()
        └── Sends PDF as native document block to Claude
        └── Retries up to 3x on 529 Overloaded (exponential backoff: 2s → 4s → 8s)
  └── parseLabReport()
        └── Extracts JSON from response
        └── Sanitizes Unicode characters
        └── Parses into typed LabReport
       │
       ▼
JSON response → React state → BiomarkerTable renders results
```

### Classification Logic

Each biomarker is classified twice:

**Lab Status** — compared against the reference range printed on the report:

- `out_of_range` — outside the lab's printed range
- `normal` — within the lab range but not longevity-optimal
- `optimal` — within the lab range AND within the longevity-optimal range

**Optimal Status** — compared against evidence-based longevity thresholds adjusted for the patient's age and sex. Examples of how optimal ranges differ from lab ranges:

| Biomarker         | Lab Range    | Longevity Optimal |
| ----------------- | ------------ | ----------------- |
| LDL Cholesterol   | < 116 mg/dL  | < 90 mg/dL        |
| Total Cholesterol | < 200 mg/dL  | < 180 mg/dL       |
| Fasting Glucose   | 74–106 mg/dL | 72–90 mg/dL       |
| HbA1c             | < 5.7%       | < 5.0%            |
| Triglycerides     | < 150 mg/dL  | < 80 mg/dL        |
| CRP               | < 5 mg/L     | < 0.5 mg/L        |
| HDL (male)        | > 40 mg/dL   | > 55 mg/dL        |

---

## Getting Started

### Prerequisites

- Node.js 18+
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/axo-lab-analyzer.git
cd axo-lab-analyzer
npm install
```

### Environment

```bash
cp .env.local.example .env.local
```

Open `.env.local` and add your key:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Testing

The test suite covers four layers of the application — lib utilities, React hooks, UI components, and the API route handler. All external dependencies (Anthropic SDK, fetch) are mocked so tests run without network access or API keys.

### Setup

```bash
npm install
npm test                  # run all tests once
npm run test:watch        # watch mode during development
npm run test:coverage     # generate coverage report
```

### Test Structure

#### `__tests__/lib/claude.test.ts` — Claude service unit tests

Tests the JSON extraction, sanitization, and retry logic in `lib/claude.ts` in complete isolation from the Anthropic SDK.

| Test                                 | What it verifies                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Parses clean JSON response           | Happy path — valid JSON returned directly                                      |
| Extracts JSON from markdown fences   | Claude occasionally wraps output in ```json blocks                             |
| Extracts JSON when prose precedes it | Claude sometimes adds an explanation before the JSON object                    |
| Sanitizes Unicode arrow characters   | `↑` / `↓` can corrupt JSON at high token counts — replaced with `HIGH` / `LOW` |
| Passes base64 string to the API      | Verifies the correct data reaches the Anthropic SDK                            |
| Throws SyntaxError on no JSON        | Plain text response with no JSON object                                        |
| Throws immediately on non-529 errors | Auth errors, bad requests — no retry                                           |
| Retries up to 3 times on 529         | 3 failures then success — verifies 4 total calls                               |
| Throws after exhausting all retries  | All 4 attempts fail — error propagates                                         |

#### `__tests__/hooks/useAnalyze.test.ts` — Hook state machine tests

Tests the full `idle → loading → result | error` state machine using fake timers to control the step interval without real delays.

| Test                                    | What it verifies                                        |
| --------------------------------------- | ------------------------------------------------------- |
| Starts in idle state                    | Initial values of all state fields                      |
| Transitions to loading immediately      | State updates before fetch resolves                     |
| Advances step counter over time         | 1800ms interval increments the step                     |
| Clamps step at last index               | Step never exceeds `LOADING_STEPS.length - 1`           |
| Transitions to result on success        | Report stored, state becomes `result`                   |
| Transitions to error on API failure     | `success: false` response sets error state              |
| Transitions to error on network failure | Thrown fetch error sets error state                     |
| Resets all state to idle                | All fields return to initial values                     |
| Handles new file after error reset      | Full round-trip: error → reset → success                |
| POSTs to correct endpoint with FormData | Verifies fetch is called with the right method and body |

#### `__tests__/components/StatusBadge.test.tsx` — Badge component tests

| Test                                     | What it verifies                               |
| ---------------------------------------- | ---------------------------------------------- |
| Renders correct label for each status    | "Optimal", "Normal", "Out of Range"            |
| Applies correct color classes            | Green / blue / red Tailwind classes per status |
| Small variant applies smaller text class | `text-[10px]` vs `text-xs`                     |
| All statuses render without crashing     | Smoke test for each enum value                 |

#### `__tests__/components/UploadZone.test.tsx` — Upload component tests

| Test                                      | What it verifies                                     |
| ----------------------------------------- | ---------------------------------------------------- |
| Renders drop zone with instructional text | Static content present on mount                      |
| Hidden input accepts PDF only             | `accept="application/pdf"` attribute                 |
| Calls onFile with a valid PDF             | Happy path file selection                            |
| Rejects non-PDF files with error message  | Wrong MIME type — error shown, onFile not called     |
| Rejects PDFs over 10MB with error message | Size limit — error shown, onFile not called          |
| Clears error when valid file is selected  | Previous error disappears on valid upload            |
| Highlights drop zone on dragOver          | Brand border class applied during drag               |
| Removes highlight on dragLeave            | Drag-active class removed                            |
| Calls onFile when valid PDF is dropped    | Drop event triggers file handler                     |
| Disables interaction during loading       | Input disabled, pointer-events-none, opacity reduced |

#### `__tests__/components/BiomarkerRow.test.tsx` — Row component tests

| Test                                   | What it verifies                              |
| -------------------------------------- | --------------------------------------------- |
| Renders biomarker name, value, unit    | Core data visible in the collapsed row        |
| Renders lab reference range            | Formatted range string in the row             |
| Renders ↑ arrow for HIGH flag          | Visual arrow converted from safe ASCII string |
| Renders ↓ arrow for LOW flag           | Downward arrow for below-range values         |
| Renders no arrow when flag is null     | In-range values show no flag                  |
| Detail panel hidden initially          | Clinical note not in DOM before click         |
| Shows detail panel on click            | Note, range bar, and range cards appear       |
| Shows longevity optimal range in panel | Optimal range value visible when expanded     |
| Hides panel on second click            | Toggle collapses the detail view              |
| Renders optimal status badge           | StatusBadge present in the row                |

#### `__tests__/components/RangeBar.test.tsx` — Range bar component tests

| Test                                    | What it verifies                      |
| --------------------------------------- | ------------------------------------- |
| Renders when reference range is defined | Track container present in DOM        |
| Renders three child layers              | Reference bar, optimal bar, value dot |
| Returns null when both ranges are null  | Nothing rendered with no range data   |
| Red dot for out_of_range status         | `bg-red-500` class on dot             |
| Brand dot for optimal status            | `bg-brand-500` class on dot           |
| Blue dot for normal status              | `bg-blue-500` class on dot            |
| Dot positioned between 0% and 100%      | Axis position is a valid percentage   |

#### `__tests__/api/analyze.test.ts` — Route handler tests

> Uses `@jest-environment node` — Next.js `NextRequest` requires Web APIs (`Request`, `FormData`, `Headers`) that are available natively in Node 18+ but not in jsdom.

| Test                                     | What it verifies                                  |
| ---------------------------------------- | ------------------------------------------------- |
| Returns 400 — no file attached           | Missing `pdf` form field                          |
| Returns 400 — non-PDF file               | Wrong MIME type rejected before Claude is called  |
| Returns 400 — file over 10MB             | Size validation before Claude is called           |
| Returns 200 with report on success       | Happy path — Claude service returns data          |
| Passes base64 string to analyzeLabReport | Correct argument type forwarded to service        |
| Returns 503 on 529 upstream error        | Overloaded error mapped to user-friendly response |
| Returns 500 on SyntaxError               | JSON parse failure from Claude service            |
| Returns 500 on unexpected error          | Generic catch-all error handling                  |

### Running a Single Test File

```bash
npm test -- __tests__/lib/claude.test.ts
npm test -- __tests__/components/StatusBadge.test.tsx
```

### Coverage

```bash
npm run test:coverage
```

Coverage is collected from all files under `app/` and `lib/`, excluding `layout.tsx` and `prompt.ts` which contain no testable logic.

---

## Deployment

### Vercel (Recommended)

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo
3. Add `ANTHROPIC_API_KEY` under **Environment Variables**
4. Click **Deploy**

Vercel auto-detects Next.js. No build configuration needed.

> **Note:** `maxDuration = 120` in `route.ts` requires Vercel Pro. To stay on the free Hobby tier, reduce it to 60 seconds.

---

## Cloud Architecture (Production)

The following describes how this application would be deployed and scaled on AWS, mirroring Axo's existing infrastructure stack.

### Architecture Diagram

```
                          ┌─────────────────────────────────────┐
                          │           User (Browser)            │
                          └──────────────┬──────────────────────┘
                                         │ HTTPS
                          ┌──────────────▼──────────────────────┐
                          │         Amazon CloudFront            │
                          │   Global CDN · Edge caching ·        │
                          │   SSL termination · DDoS protection  │
                          └──────┬───────────────────┬──────────┘
                                 │                   │
                  ┌──────────────▼───┐    ┌──────────▼──────────┐
                  │   Amazon S3      │    │   API Gateway        │
                  │ Static Assets    │    │  (HTTP API)          │
                  │ Next.js build    │    └──────────┬──────────┘
                  └──────────────────┘               │
                                         ┌───────────▼──────────┐
                                         │   AWS Lambda          │
                                         │ /api/analyze handler  │
                                         └───┬──────────────┬───┘
                                             │              │
                             ┌───────────────▼──┐    ┌──────▼────────────┐
                             │  Anthropic API    │    │  Supabase         │
                             │  Claude Sonnet    │    │  PostgreSQL       │
                             │  (PDF analysis)   │    │  (report history) │
                             └───────────────────┘    └───────────────────┘
                                                              │
                                         ┌────────────────────▼──────────┐
                                         │  Supabase Auth                │
                                         │  JWT · Row-level security     │
                                         └───────────────────────────────┘
```

### Service Breakdown

#### Amazon CloudFront

The primary entry point for all traffic. CloudFront sits in front of both the static frontend (served from S3) and the API (served via API Gateway), providing:

- Global edge caching for static assets — CSS, JS bundles, fonts served from the nearest PoP
- SSL/TLS termination with automatic certificate management via ACM
- DDoS protection through AWS Shield Standard at no additional cost
- Custom domain routing (`app.axolongevity.com` → CloudFront → S3 or API Gateway)

#### Amazon S3 — Static Assets

The Next.js production build (`next build` + `next export`) is deployed to an S3 bucket configured for static website hosting. CloudFront serves assets from this bucket with long-lived cache headers. The bucket is private — all access goes through CloudFront only.

A second S3 bucket handles **PDF storage**: when a user uploads a report, the file is written to S3 via a presigned URL (generated by Lambda) before the analysis begins. This avoids hitting Lambda's 6MB payload limit for large PDFs and keeps raw reports available for audit, reprocessing, or future model improvements. PDFs are encrypted at rest (SSE-S3) and access is scoped per-user via IAM conditions.

#### API Gateway + AWS Lambda

Each Next.js route handler (`/api/analyze`) deploys as an independent Lambda function via the OpenNext adapter or SST. API Gateway handles routing, rate limiting, and request validation at the edge before Lambda is invoked.

Lambda configuration for the analyze function:

- **Memory:** 512MB — sufficient for base64 encoding and JSON parsing
- **Timeout:** 120 seconds — accommodates Claude inference time plus retry delays
- **Concurrency:** Reserved concurrency set to prevent runaway costs during traffic spikes
- **Provisioned concurrency:** Applied during business hours to eliminate cold starts on the critical analysis path

#### Anthropic API (Claude)

The core intelligence layer. Claude receives the PDF as a base64-encoded document block and returns structured JSON containing the extracted biomarkers, classifications, and clinical notes. The API key is stored in AWS Secrets Manager and injected into Lambda at runtime via environment variable — never hardcoded or exposed to the client.

The retry logic in `lib/claude.ts` handles transient 529 Overloaded responses with exponential backoff, making the integration resilient to API load spikes.

#### Supabase — Database

Supabase PostgreSQL stores persistent application data:

```sql
-- Users managed by Supabase Auth
users (id, email, created_at)

-- One row per uploaded report
reports (
  id          uuid primary key,
  user_id     uuid references auth.users,
  pdf_s3_key  text,           -- S3 object key for the source PDF
  report_date date,
  patient_age int,
  patient_sex text,
  created_at  timestamptz
)

-- One row per extracted biomarker
biomarkers (
  id              uuid primary key,
  report_id       uuid references reports,
  name            text,
  category        text,
  value           numeric,
  unit            text,
  status          text,       -- 'optimal' | 'normal' | 'out_of_range'
  optimal_status  text,
  flag            text,
  note            text
)
```

Row-level security (RLS) policies ensure users can only read their own reports. This schema also enables trend analysis — querying a user's LDL values across all their historical reports to surface improvement or decline over time.

#### Supabase Auth

Handles user authentication with JWT tokens. The Lambda function verifies the JWT on every request using the Supabase JWT secret, ensuring that only authenticated users can trigger PDF analysis. Auth supports email/password and OAuth providers (Google, Apple) out of the box.

### CI/CD Pipeline

```
GitHub push to main
       │
       ▼
GitHub Actions
  ├── npm run build       (Next.js production build)
  ├── npm run typecheck   (tsc --noEmit)
  └── Deploy
        ├── Upload static assets → S3
        ├── Invalidate CloudFront cache
        └── Deploy Lambda functions via SST / OpenNext
```

Pushes to feature branches deploy to isolated preview environments (separate CloudFront distribution, separate Supabase branch) so changes can be reviewed before merging to main.

### Environment Variables

| Variable               | Where stored        | Used by                              |
| ---------------------- | ------------------- | ------------------------------------ |
| `ANTHROPIC_API_KEY`    | AWS Secrets Manager | Lambda — Claude API calls            |
| `SUPABASE_URL`         | Lambda environment  | Lambda — database queries            |
| `SUPABASE_SERVICE_KEY` | AWS Secrets Manager | Lambda — server-side Supabase client |
| `SUPABASE_ANON_KEY`    | CloudFront / public | Browser — Supabase Auth              |
| `NEXT_PUBLIC_API_URL`  | Build-time env      | Browser — API endpoint               |

### Estimated Monthly Cost (early-stage, < 1000 users)

| Service              | Estimated cost                     |
| -------------------- | ---------------------------------- |
| CloudFront           | ~$1–5 (first 1TB free)             |
| S3 (assets + PDFs)   | ~$2–5                              |
| API Gateway + Lambda | ~$0–5 (generous free tier)         |
| Anthropic API        | ~$10–50 (depends on report volume) |
| Supabase             | $0 (free tier up to 500MB)         |
| **Total**            | **~$15–65/month**                  |

---

## Environment Variables

| Variable            | Required | Description                                       |
| ------------------- | -------- | ------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Yes      | Your Anthropic API key from console.anthropic.com |

---

## Known Limitations

- **Single-file upload** — one PDF per analysis session; no batch processing
- **No report history** — results are not persisted between sessions (by design for the MVP)
- **PDF quality dependent** — scanned PDFs with poor OCR quality may yield incomplete extraction
- **Optimal ranges are AI-applied** — longevity thresholds are embedded in the prompt and should be reviewed by a qualified clinician before clinical use

---

## License

MIT
