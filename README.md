# DevResearch: AI Research Assistant for Developers

DevResearch is an AI-powered technical research assistant built specifically for software engineers. A developer describes a complex technical problem (e.g. database deadlocks, distributed consensus edge cases, memory leaks), and the system decomposes the problem, searches across multiple authoritative sources (Web & official docs, research papers, GitHub issues, Reddit/Hacker News, and YouTube conference transcripts), and synthesizes a single, cited technical research brief with an interactive follow-up Q&A loop.

---

## Architecture: Why Next.js App Router Full-Stack?

We chose **Next.js 14 (App Router) + TypeScript** for both frontend and backend:
1. **Single Cohesive Repository:** No disjoint microservices or cross-language serialization bottlenecks between Python (FastAPI) and React. One command (`npm run dev`) boots the entire stack.
2. **First-Class Edge / Node Streaming:** Next.js Route Handlers (`app/api/.../route.ts`) provide native Server-Sent Events (SSE) and Web Streams for real-time progressive synthesis and step progress updates.
3. **Shared TypeScript Domain Types:** Data contracts for sources, citations, briefs, and query plans (`src/types/research.ts`) are shared between frontend components and backend connectors without code generation drift.
4. **Lightweight & High Performance:** Fast REST connectors for arXiv, Semantic Scholar, GitHub, Hacker News, Reddit, Tavily, and YouTube can run with native `fetch` timeouts and connection pooling.

---

## Project Structure

```
├── .env.example               # Environment variables template
├── package.json               # Node.js dependencies and scripts
├── tailwind.config.ts         # Tailwind CSS styling and theme configuration
├── tsconfig.json              # TypeScript compilation configuration
└── src/
    ├── app/
    │   ├── globals.css        # Global CSS, dark theme variables & print media styles
    │   ├── layout.tsx         # Root layout with dark mode HTML wrapper
    │   ├── page.tsx           # Main application view with dual-pane layout & state machine
    │   └── api/               # Next.js Route Handlers for SSE streaming (Steps 2-5)
    ├── components/
    │   ├── Navbar.tsx         # Brand logo, New Research CTA, dark mode toggle
    │   ├── Sidebar.tsx        # Session history drawer, rename/delete actions & search
    │   ├── SearchInput.tsx    # Technical problem input, source toggles, depth selector & samples
    │   ├── ProgressStepper.tsx# Live 4-stage pipeline stepper (Planning, Searching, Deduplicating, Synthesizing)
    │   ├── ResearchBrief.tsx  # Synthesized brief with executive summary, approaches, pros/cons, code & citations
    │   ├── SourceCard.tsx     # Source evidence card with [n] badge, credibility rating & metadata
    │   ├── SourceList.tsx     # Filterable right pane for evidence sources by type & sort order
    │   ├── FollowUpChat.tsx   # Contextual follow-up Q&A grounded in retrieved sources
    │   ├── ExportModal.tsx    # Markdown preview, copy to clipboard, and PDF print trigger
    │   └── Icons.tsx          # Custom developer SVG icons (GitHub, YouTube)
    ├── lib/
    │   ├── mock-data.ts       # Rich sample research sessions and developer test queries
    │   └── utils.ts           # Class merge, date formatting, and markdown generator
    └── types/
        └── research.ts        # Core TypeScript interfaces: Session, SourceItem, Brief, SubQuery
```

---

## Build Plan Status

- [x] **Step 1: UI Skeleton (Completed)**
  - Interactive search page with depth selector (`Quick`, `Standard`, `Deep`)
  - Source toggles (Web, Papers, GitHub, Reddit/HN, YouTube)
  - Real developer sample queries to auto-populate complex problems
  - Animated live progress stepper simulating planning, multi-source search, and synthesis
  - Dual-pane results page: Left = synthesized brief + follow-up chat, Right = evidence sources list
  - Interactive citation badges `[1]`, `[2]` that jump to and highlight corresponding source cards
  - History sidebar with search, rename, and delete functionality
  - Export modal with Markdown preview, copy, download `.md`, and PDF print styling
- [ ] **Step 2: Web + Papers Connectors**
- [ ] **Step 3: Synthesis Pipeline (Claude 3.5 Sonnet streaming)**
- [ ] **Step 4: Remaining Connectors (YouTube transcripts, Reddit/HN, GitHub)**
- [ ] **Step 5: Persistent History & Export Finalization**

---

## Quickstart & Testing Step 1

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the local development server:**
   ```bash
   npm run dev
   ```

3. **Open the application:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

4. **What to test in Step 1:**
   - **Sample Queries:** Click any of the pre-built sample queries (e.g. *PostgreSQL partition vacuum deadlocks* or *Next.js App Router cache invalidation*).
   - **History Sidebar:** Click on past research sessions in the sidebar to view full synthesized briefs, code snippets, and evidence sources. Test renaming or deleting sessions.
   - **Live Progress Stepper:** Type a problem or click a sample, adjust source toggles & depth, and click **"Start Research"**. Watch the animated pipeline advance through query planning, searching, deduplication, and synthesis.
   - **Interactive Citations:** In the brief, click any `[1]` or `[2]` citation pill to smoothly scroll to and highlight the corresponding source card on the right.
   - **Evidence Filters:** Use the source filter pills (`All`, `Web`, `Papers`, `GitHub`, `Reddit/HN`, `YouTube`) and the sorting dropdown (`Citation Order`, `Highest Credibility`, `Most Recent`).
   - **Follow-up Chat:** Ask a question in the follow-up chat box below the brief (or click a suggestion pill).
   - **Exporting:** Click **"Export Brief"** to inspect the generated Markdown, copy it, download `.md`, or trigger **"Print / Save as PDF"**.
   - **Dark Mode:** Toggle dark/light mode in the top navbar.
