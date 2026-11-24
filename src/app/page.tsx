'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { SearchInput } from '@/components/SearchInput';
import { ProgressStepper, ProgressStepItem } from '@/components/ProgressStepper';
import { ResearchBrief } from '@/components/ResearchBrief';
import { SourceList } from '@/components/SourceList';
import { FollowUpChat } from '@/components/FollowUpChat';
import { ExportModal } from '@/components/ExportModal';
import { ResearchSession, SourceType, ResearchDepth, SubQuery, FollowUpMessage } from '@/types/research';
import { MOCK_SESSIONS } from '@/lib/mock-data';

export default function Home() {
  const [sessions, setSessions] = useState<ResearchSession[]>(MOCK_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [highlightedCitationId, setHighlightedCitationId] = useState<number | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Live Research Progress Simulation / State
  const [isSearching, setIsSearching] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStepItem[]>([]);
  const [activeSubQueries, setActiveSubQueries] = useState<SubQuery[]>([]);
  const [sourcesFoundCount, setSourcesFoundCount] = useState(0);

  // Follow-up state
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);

  // Sync dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // New research action
  const handleNewResearch = () => {
    setActiveSessionId(null);
    setIsSearching(false);
  };

  // Start research pipeline
  const handleStartResearch = (
    problem: string,
    selectedSources: SourceType[],
    depth: ResearchDepth
  ) => {
    setIsSearching(true);
    setActiveSessionId(null);

    // Initial pipeline steps
    const initialSteps: ProgressStepItem[] = [
      {
        id: 'planning',
        name: 'Planning Targeted Queries',
        description: 'Deconstructing technical problem into specialized sub-queries for each source engine',
        status: 'in_progress',
        badge: 'LLM Query Decomposition',
      },
      {
        id: 'searching',
        name: `Querying ${selectedSources.length} Source Connectors`,
        description: `Running parallel search across ${selectedSources.join(', ')}`,
        status: 'pending',
      },
      {
        id: 'processing',
        name: 'Deduplication & Credibility Ranking',
        description: 'Normalizing URLs, filtering noise, and chunking technical documents',
        status: 'pending',
      },
      {
        id: 'synthesizing',
        name: 'Synthesizing Research Brief',
        description: 'Generating executive summary, approaches, pros/cons, and inline citations',
        status: 'pending',
        badge: 'Claude 3.5 Sonnet',
      },
    ];

    setProgressSteps(initialSteps);
    setSourcesFoundCount(0);

    // Dynamic mock subqueries tailored to user problem
    const generatedSubQueries: SubQuery[] = [
      {
        id: 'sq-1',
        sourceType: 'web',
        query: `${problem.slice(0, 35)} official documentation architecture`,
        purpose: 'Official docs and architecture patterns',
      },
      {
        id: 'sq-2',
        sourceType: 'papers',
        query: `${problem.slice(0, 30)} algorithm complexity benchmark`,
        purpose: 'Academic benchmarks and formal papers',
      },
      {
        id: 'sq-3',
        sourceType: 'github',
        query: `repo:* issue ${problem.slice(0, 25)} fix workaround`,
        purpose: 'Real-world repository issues and PR discussions',
      },
      {
        id: 'sq-4',
        sourceType: 'reddit_hn',
        query: `${problem.slice(0, 30)} postmortem lessons`,
        purpose: 'Engineering incident discussions and caveats',
      },
    ];
    setActiveSubQueries(generatedSubQueries);

    // Step 1: Query Planning completes after 1.2s
    setTimeout(() => {
      setProgressSteps((prev) =>
        prev.map((step) =>
          step.id === 'planning'
            ? { ...step, status: 'completed', details: 'Generated 4 tailored sub-queries' }
            : step.id === 'searching'
            ? { ...step, status: 'in_progress' }
            : step
        )
      );
      setSourcesFoundCount(4);

      // Step 2: Searching completes after 2.4s
      setTimeout(() => {
        setProgressSteps((prev) =>
          prev.map((step) =>
            step.id === 'searching'
              ? { ...step, status: 'completed', badge: '12 items fetched' }
              : step.id === 'processing'
              ? { ...step, status: 'in_progress' }
              : step
          )
        );
        setSourcesFoundCount(12);

        // Step 3: Processing & Deduplication completes after 3.6s
        setTimeout(() => {
          setProgressSteps((prev) =>
            prev.map((step) =>
              step.id === 'processing'
                ? { ...step, status: 'completed', badge: 'Top 5 ranked & chunked' }
                : step.id === 'synthesizing'
                ? { ...step, status: 'in_progress' }
                : step
            )
          );

          // Step 4: Synthesizing completes after 4.8s
          setTimeout(() => {
            const newSessionId = `sess-${Date.now()}`;
            const newTitle = problem.length > 50 ? `${problem.slice(0, 48)}...` : problem;

            const newSession: ResearchSession = {
              id: newSessionId,
              title: newTitle,
              problem,
              depth,
              selectedSources,
              createdAt: new Date().toISOString(),
              status: 'completed',
              subQueries: generatedSubQueries,
              sources: [
                {
                  id: `src-${Date.now()}-1`,
                  citationId: 1,
                  type: 'web',
                  title: `Official Technical Guide: Best Practices for ${newTitle}`,
                  url: 'https://docs.kernel.org',
                  snippet: `Comprehensive architectural overview addressing root causes, lock hierarchies, and standard mitigations for ${problem.slice(0, 60)}.`,
                  date: '2024-02-28',
                  credibilityScore: 98,
                },
                {
                  id: `src-${Date.now()}-2`,
                  citationId: 2,
                  type: 'github',
                  title: `upstream/repo: Fix edge-case race condition in ${newTitle}`,
                  url: 'https://github.com',
                  snippet: 'Merged pull request introducing non-blocking lock timeouts and fallback handlers during heavy concurrent workloads.',
                  date: '2023-12-14',
                  credibilityScore: 95,
                  metadata: { stars: 8420 },
                },
                {
                  id: `src-${Date.now()}-3`,
                  citationId: 3,
                  type: 'papers',
                  title: `Formal Analysis and Verification of Resilient Systems under Stress`,
                  url: 'https://arxiv.org',
                  author: 'Dr. E. Dijkstra et al. (ACM / arXiv)',
                  snippet: 'Mathematical bounds showing lock contention scales quadratically with unbounded thread pools unless cooperative queuing is enforced.',
                  date: '2023-08-19',
                  credibilityScore: 94,
                  metadata: { citationCount: 42 },
                },
                {
                  id: `src-${Date.now()}-4`,
                  citationId: 4,
                  type: 'reddit_hn',
                  title: `Ask HN: How we fixed a high-priority deadlock incident with this architecture`,
                  url: 'https://news.ycombinator.com',
                  snippet: 'Post-mortem writeup detailing practical caveats, memory overhead, and monitoring metrics implemented after production downtime.',
                  date: '2024-01-09',
                  credibilityScore: 88,
                  metadata: { score: 320 },
                },
              ],
              brief: {
                summary: `Investigating "${problem}" reveals that high concurrency and misaligned resource locking lead to thread exhaustion and lock wait timeouts [1, 2]. Academic benchmarks emphasize that non-blocking cooperative queues reduce tail latencies by 70% under peak load [3]. Industry post-mortems recommend combining graceful cancellation timeouts with optimistic client updates [4].`,
                approaches: [
                  {
                    approach: 'Non-Blocking Concurrent Execution with Timeouts',
                    description: 'Isolate operations using non-blocking primitives and explicit statement timeouts to prevent cascading worker deadlocks.',
                    pros: [
                      'Eliminates head-of-line blocking for high-traffic write paths',
                      'Deterministic failure recovery within fixed latency envelopes',
                    ],
                    cons: [
                      'Requires application-level retry logic with exponential jitter',
                    ],
                    complexity: 'Low',
                  },
                  {
                    approach: 'Dedicated Asynchronous Task Offloading Pool',
                    description: 'Offload long-running maintenance and heavy tasks to a background queue (e.g. BullMQ, Celery, Temporal) decoupled from client traffic.',
                    pros: [
                      'Complete isolation of critical API request-response loops',
                      'Fine-grained concurrency controls and burst rate-limiting',
                    ],
                    cons: [
                      'Adds infrastructure dependency and queue monitoring overhead',
                    ],
                    complexity: 'Medium',
                  },
                ],
                recommendedSolution: {
                  title: 'Two-Tier Graceful Handling: Strict Lock Timeouts + Dedicated Worker Pools',
                  rationale: 'Enforcing strict timeouts at the database/system layer guarantees that client connection pools never deplete [1]. Pairing this with background worker scheduling prevents contending operations from running during peak business hours [4].',
                  tradeoffs: 'Clients must handle transient timeout retries cleanly using idempotency keys.',
                  architectureNotes: 'Instrument metrics on lock wait duration and queue backlog depth to trigger proactive auto-scaling alerts.',
                },
                codeSnippets: [
                  {
                    language: 'typescript',
                    title: 'Resilient Retry Wrapper with Exponential Backoff & Jitter',
                    code: `async function executeWithResilience<T>(
  task: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 150
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await task();
    } catch (err: any) {
      attempt++;
      if (attempt > maxRetries || !isRetryableError(err)) {
        throw err;
      }
      // Full jitter: min(maxDelay, random_between(0, baseDelay * 2^attempt))
      const delay = Math.random() * (baseDelayMs * Math.pow(2, attempt));
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}`,
                    explanation: 'Prevents thundering herd problems during transient lock contention using randomized jitter.',
                  },
                ],
                keyPapersAndVideos: [
                  {
                    title: 'Formal Analysis of Resilient Systems under Stress',
                    url: 'https://arxiv.org',
                    type: 'paper',
                    takeaway: 'Mathematical proof of deadlock avoidance in finite state automata under heavy load [3].',
                    citationId: 3,
                  },
                ],
                openQuestions: [
                  'What is the maximum tolerable latency threshold for client-facing transactions?',
                  'Are there read-only replicas that could handle read load to alleviate primary contention?',
                ],
              },
              followUps: [],
            };

            setSessions((prev) => [newSession, ...prev]);
            setActiveSessionId(newSessionId);
            setIsSearching(false);
          }, 1200);
        }, 1200);
      }, 1200);
    }, 1200);
  };

  // Follow-up chat submission
  const handleSendFollowUp = (content: string) => {
    if (!activeSession) return;
    setIsFollowUpLoading(true);

    const userMsg: FollowUpMessage = {
      id: `fu-${Date.now()}-u`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    const updatedSession = {
      ...activeSession,
      followUps: [...activeSession.followUps, userMsg],
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? updatedSession : s))
    );

    // Simulate grounded assistant response citing collected sources
    setTimeout(() => {
      const assistantMsg: FollowUpMessage = {
        id: `fu-${Date.now()}-a`,
        role: 'assistant',
        content: `Based on the collected sources for this problem, when handling "${content.slice(0, 45)}":\n\n1. **Locking & Recovery:** Ensure that any failure triggers an immediate rollback before retrying, as highlighted in the official guidance [1].\n2. **Monitoring:** Review worker latency and active transactions using Prometheus metrics to catch resource exhaustion early [2, 4].\n3. **Rollback Strategy:** The upstream patch provides a safe fallback handler that preserves consistent state without data loss [2].`,
        timestamp: new Date().toISOString(),
        citedSources: [1, 2, 4],
      };

      const finalSession = {
        ...updatedSession,
        followUps: [...updatedSession.followUps, assistantMsg],
      };

      setSessions((prev) =>
        prev.map((s) => (s.id === activeSession.id ? finalSession : s))
      );
      setIsFollowUpLoading(false);
    }, 1000);
  };

  // Citation click handler (scroll to source card & highlight)
  const handleCitationClick = (citationId: number) => {
    setHighlightedCitationId(citationId);
    const element = document.getElementById(`source-${citationId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => setHighlightedCitationId(null), 3500);
  };

  // Session rename
  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s))
    );
  };

  // Session delete
  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Top Navbar */}
      <Navbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onNewResearch={handleNewResearch}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        hasActiveSession={activeSession !== null || isSearching}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Session History */}
        <Sidebar
          isOpen={isSidebarOpen}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => {
            setActiveSessionId(id);
            setIsSearching(false);
          }}
          onNewResearch={handleNewResearch}
          onRenameSession={handleRenameSession}
          onDeleteSession={handleDeleteSession}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {/* View 1: Active Research Pipeline Animation */}
          {isSearching && (
            <div className="p-4 sm:p-8">
              <ProgressStepper
                steps={progressSteps}
                subQueries={activeSubQueries}
                sourcesFoundCount={sourcesFoundCount}
                onCancel={() => setIsSearching(false)}
              />
            </div>
          )}

          {/* View 2: Results Page (Dual Pane: Left = Brief, Right = Sources) */}
          {!isSearching && activeSession && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Pane (7 or 8 cols): Synthesized Brief & Follow-up Q&A */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                  <ResearchBrief
                    session={activeSession}
                    onCitationClick={handleCitationClick}
                    onOpenExportModal={() => setIsExportModalOpen(true)}
                  />

                  {/* Follow-up Technical Q&A */}
                  <FollowUpChat
                    messages={activeSession.followUps}
                    sources={activeSession.sources}
                    onSendMessage={handleSendFollowUp}
                    isLoading={isFollowUpLoading}
                    onCitationClick={handleCitationClick}
                  />
                </div>

                {/* Right Pane (5 or 4 cols): Sources List with Filters & Sorting */}
                <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
                  <SourceList
                    sources={activeSession.sources}
                    highlightedCitationId={highlightedCitationId}
                    onSelectCitation={handleCitationClick}
                  />
                </div>
              </div>
            </div>
          )}

          {/* View 3: Search Input Landing Page */}
          {!isSearching && !activeSession && (
            <SearchInput
              onStartResearch={handleStartResearch}
              isSubmitting={isSearching}
            />
          )}
        </main>
      </div>

      {/* Export Modal */}
      {activeSession && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          session={activeSession}
        />
      )}
    </div>
  );
}
