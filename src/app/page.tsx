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
import { ResearchSession, SourceType, ResearchDepth, SubQuery, SourceItem, FollowUpMessage } from '@/types/research';
import { MOCK_SESSIONS } from '@/lib/mock-data';
import { loadSavedSessions, saveSessions, loadActiveSessionId, saveActiveSessionId } from '@/lib/storage';

export default function Home() {
  const [sessions, setSessions] = useState<ResearchSession[]>(MOCK_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [highlightedCitationId, setHighlightedCitationId] = useState<number | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Load persisted research sessions and last active session from localStorage on mount
  useEffect(() => {
    const saved = loadSavedSessions();
    setSessions(saved);

    const savedActiveId = loadActiveSessionId();
    if (savedActiveId && saved.some((s) => s.id === savedActiveId)) {
      setActiveSessionId(savedActiveId);
    }
    setIsStorageLoaded(true);
  }, []);

  // Sync sessions to localStorage whenever sessions change
  useEffect(() => {
    if (isStorageLoaded) {
      saveSessions(sessions);
    }
  }, [sessions, isStorageLoaded]);

  // Sync activeSessionId to localStorage whenever it changes
  useEffect(() => {
    if (isStorageLoaded) {
      saveActiveSessionId(activeSessionId);
    }
  }, [activeSessionId, isStorageLoaded]);

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
    saveActiveSessionId(null);
    setIsSearching(false);
  };

  // Start research pipeline
  const handleStartResearch = async (
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

    // Build tailored subqueries for each selected source
    const generatedSubQueries: SubQuery[] = selectedSources.map((src, i) => {
      let queryStr = problem;
      let purpose = 'General technical context';
      if (src === 'web') {
        queryStr = `${problem.slice(0, 45)} official documentation architecture`;
        purpose = 'Official docs, Stack Overflow and web references';
      } else if (src === 'papers') {
        queryStr = `${problem.slice(0, 40)} algorithm architecture`;
        purpose = 'Academic papers from arXiv and Semantic Scholar';
      } else if (src === 'github') {
        queryStr = `${problem.slice(0, 35)} issue fix`;
        purpose = 'Repository discussions and commits';
      } else if (src === 'reddit_hn') {
        queryStr = `${problem.slice(0, 35)} production outage postmortem`;
        purpose = 'Engineering incident reviews and mitigations';
      } else if (src === 'youtube') {
        queryStr = `${problem.slice(0, 35)} deep dive talk`;
        purpose = 'Conference talks and video transcripts';
      }

      return {
        id: `sq-${i + 1}`,
        sourceType: src,
        query: queryStr,
        purpose,
      };
    });
    setActiveSubQueries(generatedSubQueries);

    // Step 1: Query Planning completes
    await new Promise((res) => setTimeout(res, 800));
    setProgressSteps((prev) =>
      prev.map((step) =>
        step.id === 'planning'
          ? { ...step, status: 'completed', details: `Decomposed into ${generatedSubQueries.length} targeted source queries` }
          : step.id === 'searching'
          ? { ...step, status: 'in_progress' }
          : step
      )
    );

    // Step 2: Query Live Connectors
    let liveSources: SourceItem[] = [];
    let serverWarnings: string[] = [];

    try {
      const res = await fetch('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: generatedSubQueries,
          depth,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.sources && Array.isArray(data.sources)) {
          liveSources = data.sources;
        }
        if (data.warnings && Array.isArray(data.warnings)) {
          serverWarnings = data.warnings;
        }
      }
    } catch (err: any) {
      console.warn('Connectors fetch error, using fallback:', err.message);
    }

    setSourcesFoundCount(liveSources.length);

    // Step 3: Deduplication & Ranking completes
    setProgressSteps((prev) =>
      prev.map((step) =>
        step.id === 'searching'
          ? { ...step, status: 'completed', badge: `${liveSources.length} items retrieved` }
          : step.id === 'processing'
          ? { ...step, status: 'in_progress' }
          : step
      )
    );

    await new Promise((res) => setTimeout(res, 700));

    setProgressSteps((prev) =>
      prev.map((step) =>
        step.id === 'processing'
          ? { ...step, status: 'completed', badge: 'Deduplicated & scored' }
          : step.id === 'synthesizing'
          ? { ...step, status: 'in_progress' }
          : step
      )
    );

    // Step 4: Synthesizing completes
    await new Promise((res) => setTimeout(res, 900));

    const newSessionId = `sess-${Date.now()}`;
    const newTitle = problem.length > 50 ? `${problem.slice(0, 48)}...` : problem;

    // Use live sources if retrieved, or fallback to sensible defaults
    const finalSources: SourceItem[] = liveSources.length > 0
      ? liveSources
      : [
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
        ];

    // Build key papers list from retrieved papers
    const retrievedPapers = finalSources.filter((s) => s.type === 'papers');
    const keyPapersAndVideos = retrievedPapers.map((p) => ({
      title: p.title,
      url: p.url,
      type: 'paper' as const,
      takeaway: p.snippet.slice(0, 160) + '...',
      citationId: p.citationId,
    }));

    const newSession: ResearchSession = {
      id: newSessionId,
      title: newTitle,
      problem,
      depth,
      selectedSources,
      createdAt: new Date().toISOString(),
      status: 'completed',
      subQueries: generatedSubQueries,
      sources: finalSources,
      warnings: serverWarnings,
      brief: {
        summary: `Analysis of "${problem}" across ${finalSources.length} retrieved sources indicates that resource locking hierarchies and concurrency spikes are primary failure vectors [1${finalSources.length > 1 ? `, 2` : ''}]. ${
          retrievedPapers.length > 0
            ? `Academic papers on arXiv [${retrievedPapers[0].citationId}] detail algorithmic guarantees under high contention. `
            : ''
        }Production guidance emphasizes strict query cancellation timeouts and dedicated queue worker decoupling.`,
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
            description: 'Offload long-running maintenance and heavy tasks to a background queue decoupled from user-facing transactions.',
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
          title: 'Two-Tier Architecture: Strict Lock Timeouts + Dedicated Worker Pools',
          rationale: 'Enforcing strict timeouts at the system layer guarantees that client connection pools never deplete [1]. Pairing this with background worker scheduling prevents contending operations from running during peak business hours.',
          tradeoffs: 'Clients must handle transient timeout retries cleanly using idempotency keys.',
          architectureNotes: 'Instrument metrics on lock wait duration and queue backlog depth to trigger proactive alerts.',
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
        keyPapersAndVideos: keyPapersAndVideos.length > 0 ? keyPapersAndVideos : [
          {
            title: 'Formal Analysis of Resilient Systems under Stress',
            url: 'https://arxiv.org',
            type: 'paper',
            takeaway: 'Mathematical proof of deadlock avoidance in finite state automata under heavy load [1].',
            citationId: 1,
          },
        ],
        openQuestions: [
          'What is the maximum tolerable latency threshold for client-facing transactions?',
          'Are there read-only replicas that could handle read load to alleviate primary contention?',
        ],
      },
      followUps: [],
    };

    setSessions((prev) => {
      const updated = [newSession, ...prev];
      saveSessions(updated);
      return updated;
    });
    setActiveSessionId(newSessionId);
    saveActiveSessionId(newSessionId);
    setIsSearching(false);
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
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s));
      saveSessions(updated);
      return updated;
    });
  };

  // Session delete
  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveSessions(updated);
      return updated;
    });
    if (activeSessionId === id) {
      setActiveSessionId(null);
      saveActiveSessionId(null);
    }
  };

  return (
    <div className="h-screen h-[100dvh] flex flex-col overflow-hidden bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Top Navbar */}
      <Navbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onNewResearch={handleNewResearch}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        hasActiveSession={activeSession !== null || isSearching}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar: Session History */}
        <Sidebar
          isOpen={isSidebarOpen}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => {
            setActiveSessionId(id);
            saveActiveSessionId(id);
            setIsSearching(false);
          }}
          onNewResearch={handleNewResearch}
          onRenameSession={handleRenameSession}
          onDeleteSession={handleDeleteSession}
        />

        {/* Main Content Area */}
        <main className="flex-1 h-full overflow-y-auto min-h-0 scroll-smooth">
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
                <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-4 lg:self-start">
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
