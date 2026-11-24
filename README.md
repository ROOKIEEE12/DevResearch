# DevResearch — AI Research Assistant for Developers

DevResearch is a full-stack AI-powered technical research assistant built specifically for software engineers. A developer describes a complex technical problem (e.g. database deadlocks, distributed consensus edge cases, React Server Components performance), and the system:

1. **Plans targeted sub-queries** using Anthropic Claude 3.5 Sonnet
2. **Searches multiple official sources in parallel** (Web & official docs, arXiv & Semantic Scholar papers, GitHub issues & repos, Reddit & Hacker News, YouTube talks)
3. **Deduplicates, scores credibility, and assigns citations** `[1]`, `[2]`, ...
4. **Streams live progress via SSE** and synthesizes a structured research brief with inline citations, pros/cons, runnable code snippets, and open questions
5. **Supports grounded follow-up Q&A**, persistent session history, and Markdown / PDF export

---

## Architecture: Why Next.js App Router Full-Stack?

We chose **Next.js 14 (App Router) + TypeScript + Tailwind CSS** for both frontend and backend:
1. **Single Cohesive Repository:** One command (`npm run dev`) boots both UI and API routes with zero cross-language serialization overhead.
2. **Native SSE Streaming:** Next.js Route Handlers (`src/app/api/research/route.ts`) stream live Server-Sent Events (`step`, `queries`, `sources`, `warning`, `brief`, `done`).
3. **Shared TypeScript Contracts:** Types in `src/types/research.ts` are shared directly between React components, connectors, and Claude synthesis.
4. **Graceful Degradation:** If any external source API hits rate limits or lacks an optional API key, the pipeline surfaces a non-fatal warning and continues with the remaining sources.

---

## Project Structure

```
├── .env.example                     # Environment variables template
├── package.json                     # Dependencies and scripts (runs on port 3003)
├── scripts/
│   └── test-connectors.ts           # Standalone CLI test suite for all 5 connectors
└── src/
    ├── app/
    │   ├── globals.css              # Dark theme variables, scrollbars & print-to-PDF styles
    │   ├── layout.tsx               # Root layout (dark mode default)
    │   ├── page.tsx                 # Dual-pane workspace, SSE client & state management
    │   └── api/
    │       ├── research/route.ts    # POST: full SSE research pipeline (plan -> search -> synthesize)
    │       ├── followup/route.ts    # POST: Claude follow-up Q&A grounded in retrieved sources
    │       ├── connectors/route.ts  # GET/POST: direct multi-source connector endpoint
    │       └── sessions/route.ts    # GET/POST: file-backed session persistence (data/sessions.json)
    ├── components/
    │   ├── Navbar.tsx               # Brand logo, New Research CTA, dark mode toggle
    │   ├── Sidebar.tsx              # Persistent history drawer (search, rename, delete)
    │   ├── SearchInput.tsx          # Problem input, source toggles, depth selector & samples
    │   ├── ProgressStepper.tsx      # Live 4-stage pipeline stepper
    │   ├── ResearchBrief.tsx        # Executive summary, approaches, pros/cons, code & [n] citations
    │   ├── SourceCard.tsx           # Evidence card with [n] badge, credibility & metadata
    │   ├── SourceList.tsx           # Filterable & sortable evidence pane
    │   ├── FollowUpChat.tsx         # Grounded follow-up Q&A chat
    │   ├── ExportModal.tsx          # Markdown preview, copy, .md download & PDF print
    │   └── Icons.tsx                # Custom GitHub and YouTube SVG icons
    ├── lib/
    │   ├── synthesize.ts            # Claude query planning, brief synthesis & follow-up Q&A
    │   ├── rateLimit.ts             # Sliding-window API rate limiter
    │   ├── storage.ts               # Client localStorage persistence helpers
    │   ├── mock-data.ts             # Sample technical queries and initial sessions
    │   ├── utils.ts                 # Formatting and Markdown brief generator
    │   └── connectors/
    │       ├── types.ts             # Common SourceConnector interface
    │       ├── cache.ts             # 15-minute TTL in-memory query cache
    │       ├── fetchWithTimeout.ts  # AbortController timeout wrapper
    │       ├── web.ts               # Tavily + Brave Search + official docs/SO scoring
    │       ├── papers.ts            # arXiv Atom XML + Semantic Scholar Graph API
    │       ├── github.ts            # GitHub REST Search API (Issues, PRs & Repos)
    │       ├── reddit.ts            # Reddit public JSON API + Hacker News Algolia API
    │       ├── youtube.ts           # YouTube Data API v3 search & video metadata
    │       └── index.ts             # Parallel orchestrator, URL deduplication & ranking
    └── types/
        └── research.ts              # Core TypeScript interfaces
```

---

## Required & Optional API Keys

Copy `.env.example` to `.env` and fill in your keys:

| Variable | Required? | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Required** | Claude 3.5 Sonnet for query planning, synthesis, and follow-up Q&A |
| `ANTHROPIC_MODEL` | Optional | Defaults to `claude-3-5-sonnet-20241022` |
| `TAVILY_API_KEY` | Recommended | Primary Web search connector (official docs, Stack Overflow, blogs) |
| `BRAVE_SEARCH_API_KEY` | Optional | Fallback Web search connector if Tavily is not set |
| `GITHUB_TOKEN` | Recommended | GitHub Personal Access Token (raises search limit from 10 to 30 req/min) |
| `YOUTUBE_API_KEY` | Recommended | YouTube Data API v3 key for conference talks & deep-dive videos |
| `SEMANTIC_SCHOLAR_API_KEY` | Optional | Higher rate limits on Semantic Scholar (arXiv requires no key) |

> Reddit and Hacker News use open public REST endpoints (`reddit.com` JSON + `hn.algolia.com`) and require no API keys.

---

## Setup & Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Add your ANTHROPIC_API_KEY and connector keys in .env
   ```

3. **Start the development server (runs on port 3003):**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3003](http://localhost:3003) in your browser.

4. **Test all 5 source connectors via CLI:**
   ```bash
   npx tsx scripts/test-connectors.ts
   ```

5. **Production build:**
   ```bash
   npm run build
   npm run start
   ```

---

## Build Plan Status

- [x] **Step 1: UI Skeleton** — Dual-pane layout, search input, progress stepper, citation jump-to-source, dark mode
- [x] **Step 2: Web + Papers Connectors** — Tavily/Brave + arXiv/Semantic Scholar with caching & timeouts
- [x] **Step 3: Synthesis Pipeline** — Claude query planning, SSE streaming `/api/research`, grounded `/api/followup`
- [x] **Step 4: Remaining Connectors** — GitHub Issues/Repos, Reddit + Hacker News, YouTube Data API v3
- [x] **Step 5: History, Rate Limiting & Export** — Persistent localStorage + `/api/sessions` sync, sliding-window rate limiter, Markdown & print-to-PDF export, full README
