import { ResearchSession } from "@/types/research";

export const SAMPLE_QUERIES = [
  {
    title: "PostgreSQL vacuum deadlocks on large partitioned tables",
    description: "Autovacuum worker deadlocks during concurrent partition detach and heavy INSERT traffic in PostgreSQL 15+",
    depth: "deep" as const,
    sources: ["web", "papers", "reddit_hn", "github"] as const,
  },
  {
    title: "Next.js App Router streaming SSR vs Server Actions cache invalidation",
    description: "Strategies to handle revalidateTag and router.refresh() without tearing down active React Server Components streaming states",
    depth: "standard" as const,
    sources: ["web", "github", "reddit_hn"] as const,
  },
  {
    title: "Distributed consensus: Raft joint consensus vs multi-Paxos under asymmetric network partitions",
    description: "Membership changes and split-brain guarantees during transient network partitions in Raft vs Paxos algorithms",
    depth: "deep" as const,
    sources: ["papers", "web", "youtube"] as const,
  },
  {
    title: "Memory leaks in Go goroutines under high-throughput WebSocket hubs",
    description: "Diagnosing unbounded buffered channel backpressure, pprof goroutine leak profiles, and zero-allocation socket pools",
    depth: "standard" as const,
    sources: ["github", "reddit_hn", "web"] as const,
  },
];

export const MOCK_SESSIONS: ResearchSession[] = [
  {
    id: "sess-1",
    title: "PostgreSQL Partition Vacuum Deadlocks",
    problem: "Autovacuum worker deadlocks during concurrent partition detach and heavy INSERT traffic in PostgreSQL 15+",
    depth: "deep",
    selectedSources: ["web", "papers", "reddit_hn", "github"],
    createdAt: "2024-11-24T17:15:00.000Z",
    status: "completed",
    subQueries: [
      {
        id: "sq-1",
        sourceType: "web",
        query: "postgresql autovacuum partition detach lock conflict AccessExclusiveLock",
        purpose: "Official docs and DBA post-mortems on table locking hierarchy",
      },
      {
        id: "sq-2",
        sourceType: "papers",
        query: "concurrency control partitioned b-tree index vacuuming lock-free garbage collection",
        purpose: "Academic foundations for multi-version vacuum concurrency",
      },
      {
        id: "sq-3",
        sourceType: "github",
        query: "repo:postgres/postgres autovacuum deadlocks DETACH PARTITION CONCURRENTLY",
        purpose: "PostgreSQL git commit history and open patch discussions",
      },
      {
        id: "sq-4",
        sourceType: "reddit_hn",
        query: "autovacuum deadlock partitioned table production outage",
        purpose: "Real-world engineering incident reviews and mitigations",
      },
    ],
    sources: [
      {
        id: "src-1",
        citationId: 1,
        type: "web",
        title: "PostgreSQL Documentation: Explicit Locking & Partition Maintenance",
        url: "https://www.postgresql.org/docs/current/explicit-locking.html",
        snippet: "ALTER TABLE ... DETACH PARTITION acquires an ACCESS EXCLUSIVE lock on both the partitioned parent table and the partition being detached, conflicting with SHARE UPDATE EXCLUSIVE locks requested by autovacuum workers.",
        date: "2024-03-12",
        credibilityScore: 98,
        metadata: { score: 1420 },
      },
      {
        id: "src-2",
        citationId: 2,
        type: "github",
        title: "postgres/postgres: Fix deadlock in autovacuum with concurrent DETACH PARTITION CONCURRENTLY",
        url: "https://github.com/postgres/postgres/commit/72f49c0",
        snippet: "DETACH PARTITION CONCURRENTLY avoids taking an ACCESS EXCLUSIVE lock on the parent table directly in step 1, preventing lock starvation against concurrent autovacuum workers on partition boundaries.",
        date: "2023-11-20",
        credibilityScore: 96,
        metadata: { stars: 15400 },
      },
      {
        id: "src-3",
        citationId: 3,
        type: "papers",
        title: "Scalable Garbage Collection in High-Performance Partitioned Relational Engines",
        url: "https://arxiv.org/abs/2204.09812",
        snippet: "We demonstrate that traditional epoch-based vacuuming suffers up to 83% transaction abort rates when dynamic table partition metadata modifications collide with non-blocking index cleanup tasks.",
        author: "H. Lindqvist et al. (VLDB / arXiv)",
        date: "2022-09-15",
        credibilityScore: 94,
        metadata: { citationCount: 68 },
      },
      {
        id: "src-4",
        citationId: 4,
        type: "reddit_hn",
        title: "Hacker News: Lessons from a 3-hour Postgres deadlock cascade in production",
        url: "https://news.ycombinator.com/item?id=38192841",
        snippet: "Our cron job ran DETACH PARTITION at 02:00. Autovacuum kicked in simultaneously. Client threads queued for RowExclusiveLock behind the AccessExclusive request, maxing out max_connections within 45 seconds.",
        date: "2023-10-04",
        credibilityScore: 89,
        metadata: { score: 412 },
      },
      {
        id: "src-5",
        citationId: 5,
        type: "web",
        title: "PgBouncer & Autovacuum Tuning Guide for Time-Series Partitioning",
        url: "https://brandur.org/postgres-partitioning-vacuum",
        snippet: "Setting autovacuum_vacuum_cost_limit higher for partitions, reducing statement_timeout during maintenance, and utilizing DETACH PARTITION CONCURRENTLY is the proven pattern.",
        date: "2024-01-18",
        credibilityScore: 91,
      },
    ],
    brief: {
      summary: "The root cause of autovacuum deadlocks during partition detachment lies in PostgreSQL's locking hierarchy: standard `DETACH PARTITION` requires an `ACCESS EXCLUSIVE` lock on both parent and child partitions [1]. When autovacuum is already holding a `SHARE UPDATE EXCLUSIVE` lock to vacuum dead tuples, incoming `INSERT` operations queue behind the pending `ACCESS EXCLUSIVE` lock request, rapidly escalating into a lock inversion cascade or deadlock [4]. The solution involves two-phase concurrent detachment coupled with dynamic autovacuum throttling [2, 5].",
      approaches: [
        {
          approach: "Two-Phase Non-Blocking Detach (`CONCURRENTLY`)",
          description: "Utilize `ALTER TABLE parent DETACH PARTITION child CONCURRENTLY;` introduced in PG 14 to split detachment into two phases, avoiding parent lock queues.",
          pros: [
            "Never blocks concurrent read or write transactions on the parent table",
            "Autovacuum can safely complete before final metadata purge",
            "Zero client transaction downtime",
          ],
          cons: [
            "Cannot be run inside a transaction block (BEGIN...COMMIT)",
            "Takes longer to finish as it waits for existing snapshot transactions to drain",
          ],
          complexity: "Low",
        },
        {
          approach: "Pre-emptive Autovacuum Termination with Advisory Locks",
          description: "Script maintenance scripts to query `pg_stat_activity`, gracefully cancel active vacuum workers on the target partition, and acquire an explicit application-level lock.",
          pros: [
            "Gives 100% deterministic maintenance execution windows",
            "Prevents connection pool exhaustion spikes",
          ],
          cons: [
            "Requires custom orchestration tooling or Airflow/Temporal DAGs",
            "Postponing vacuuming can accumulate index bloat if scripts fail",
          ],
          complexity: "Medium",
        },
        {
          approach: "Table-Level Autovacuum Parameter Tuning",
          description: "Tune `autovacuum_vacuum_cost_delay = 0` and `autovacuum_vacuum_cost_limit = 2000` specifically for high-churn hot partitions while disabling autovacuum on stale cold partitions.",
          pros: [
            "Accelerates vacuum completion 10x before detach cron begins",
            "Permanent configuration safeguard without external code changes",
          ],
          cons: [
            "Increased disk I/O burst while vacuum is actively running",
          ],
          complexity: "Low",
        },
      ],
      recommendedSolution: {
        title: "Hybrid Strategy: DETACH CONCURRENTLY + Target Partition Grace Period",
        rationale: "Using `DETACH PARTITION CONCURRENTLY` eliminates the root cause of `ACCESS EXCLUSIVE` table-level lock starvation [2]. Combining this with a brief check for active autovacuum workers via `pg_stat_activity` guarantees deterministic execution without service disruption [1, 5].",
        tradeoffs: "Concurrent detach waits for open transactions in other backends to finish. If long-running analytical queries exist, detachment may take several minutes; enforce a modest `lock_timeout`.",
        architectureNotes: "Always detach old partitions during lower-traffic windows and run `VACUUM FREEZE` on the detached child before archiving to cold storage.",
      },
      codeSnippets: [
        {
          language: "sql",
          title: "Safe Zero-Downtime Partition Detach Script",
          code: `-- 1. Prevent indefinite lock queue starvation
SET lock_timeout = '5s';
SET statement_timeout = '60s';

-- 2. Gracefully cancel any active autovacuum on this specific partition
SELECT pg_cancel_backend(pid)
FROM pg_stat_activity
WHERE query ILIKE '%autovacuum%'
  AND query ILIKE '%measurements_y2024m02%'
  AND pid <> pg_backend_pid();

-- 3. Detach concurrently without locking parent table for writes
ALTER TABLE measurements
  DETACH PARTITION measurements_y2024m02 CONCURRENTLY;`,
          explanation: "Sets tight lock timeouts so clients are never blocked, gracefully cancels any active partition-level vacuum worker, and runs concurrent detachment.",
        },
        {
          language: "sql",
          title: "Hot-Partition Autovacuum Acceleration Tuning",
          code: `-- Accelerate vacuum on actively written partitions so workers finish fast
ALTER TABLE measurements_y2024m03 SET (
  autovacuum_vacuum_cost_delay = 2,
  autovacuum_vacuum_cost_limit = 2000,
  autovacuum_vacuum_scale_factor = 0.05
);`,
          explanation: "Reduces cost delays to complete routine tuple cleanup 5x faster, preventing overlapping maintenance windows.",
        },
      ],
      keyPapersAndVideos: [
        {
          title: "Scalable Garbage Collection in High-Performance Partitioned Relational Engines",
          url: "https://arxiv.org/abs/2204.09812",
          type: "paper",
          takeaway: "In-depth analysis of multi-version lock contention in partitioned tables and modern non-blocking solutions [3].",
          citationId: 3,
        },
        {
          title: "PostgreSQL Locking & Partition Maintenance Internals",
          url: "https://www.postgresql.org/docs/current/explicit-locking.html",
          type: "discussion",
          takeaway: "Complete lock compatibility matrix and `CONCURRENTLY` constraints [1].",
          citationId: 1,
        },
      ],
      openQuestions: [
        "Are there long-running analytical transactions (`SELECT` queries spanning > 10 minutes) on the parent table that will delay `DETACH CONCURRENTLY`?",
        "What is your target disk I/O budget during peak hours when accelerated autovacuum executes?",
        "Are foreign keys referencing the partitioned parent table present, which can introduce additional implicit row-share locks?",
      ],
    },
    followUps: [
      {
        id: "fu-1",
        role: "user",
        content: "What happens if DETACH PARTITION CONCURRENTLY fails midway? How do we recover?",
        timestamp: "2024-11-24T17:30:00.000Z",
      },
      {
        id: "fu-2",
        role: "assistant",
        content: "If `DETACH CONCURRENTLY` is interrupted (e.g. by `lock_timeout` or cancellation), the partition enters an intermediate state marked as **partially detached** in `pg_inherits` [2]. In this state, queries on the parent will no longer scan the child, but the child still references the parent. You can safely either:\n1. Re-run `ALTER TABLE parent DETACH PARTITION child FINALIZE;` to complete the detach.\n2. Or run `ALTER TABLE parent DETACH PARTITION child CONCURRENTLY;` again.\nBoth commands will pick up exactly where it left off without corrupting data [1].",
        timestamp: "2024-11-24T17:31:00.000Z",
        citedSources: [1, 2],
      },
    ],
  },
  {
    id: "sess-2",
    title: "Next.js App Router Cache Invalidation",
    problem: "Next.js App Router streaming SSR vs Server Actions cache invalidation with revalidateTag",
    depth: "standard",
    selectedSources: ["web", "github", "reddit_hn"],
    createdAt: "2024-11-24T12:00:00.000Z",
    status: "completed",
    subQueries: [
      {
        id: "sq-21",
        sourceType: "web",
        query: "next.js app router revalidateTag streaming rsc cache invalidation",
        purpose: "Next.js official cache life cycle and router refresh mechanics",
      },
      {
        id: "sq-22",
        sourceType: "github",
        query: "repo:vercel/next.js revalidateTag streaming layout flicker router.refresh",
        purpose: "Open issues on RSC streaming disruption during action revalidation",
      },
    ],
    sources: [
      {
        id: "src-21",
        citationId: 1,
        type: "web",
        title: "Next.js Documentation: Caching & Revalidating Data in App Router",
        url: "https://nextjs.org/docs/app/building-your-application/caching",
        snippet: "Server Actions automatically revalidate the path where they were called. Invoking revalidateTag('key') purges the Data Cache and triggers a targeted RSC payload recalculation.",
        date: "2024-02-14",
        credibilityScore: 97,
      },
      {
        id: "src-22",
        citationId: 2,
        type: "github",
        title: "vercel/next.js #54133: Suspense boundary reset during Server Action revalidation",
        url: "https://github.com/vercel/next.js/issues/54133",
        snippet: "When a Server Action revalidates tags, parent layout suspense boundaries occasionally re-trigger fallback UI rather than updating in-place with startTransition.",
        date: "2023-12-08",
        credibilityScore: 92,
      },
    ],
    brief: {
      summary: "In Next.js App Router, invoking `revalidateTag()` inside a Server Action updates both the Data Cache and the Client-side Router Cache [1]. If unhandled, this can tear down active React `Suspense` streaming states and cause UI flicker. The recommended pattern is wrapping client-side state transitions in React 18 `useTransition()` and returning optimistic state payloads directly from Server Actions [2].",
      approaches: [
        {
          approach: "Optimistic State + Deferred revalidateTag",
          description: "Use React's `useOptimistic` hook for immediate UI feedback while the server action quietly revalidates background tags.",
          pros: ["Zero visual glitching", "Feels instantaneous to end user"],
          cons: ["Requires rollback logic if server action rejects"],
          complexity: "Medium",
        },
      ],
      recommendedSolution: {
        title: "Optimistic Client Updates + Granular Tag Scoping",
        rationale: "Avoid calling broad `revalidatePath('/')`. Use narrow tag scopes (e.g. `tag: item-${id}`) so only affected components re-render.",
        tradeoffs: "More bookkeeping of cache tags across fetch calls.",
      },
      codeSnippets: [],
      keyPapersAndVideos: [],
      openQuestions: ["Are you using React 19 canary or Next.js 14 stable?"],
    },
    followUps: [],
  },
];

