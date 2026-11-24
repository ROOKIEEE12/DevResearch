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
import { ResearchSession, SourceType, ResearchDepth, SubQuery, SourceItem, FollowUpMessage, ResearchBriefData } from '@/types/research';
import { MOCK_SESSIONS } from '@/lib/mock-data';
import { loadSavedSessions, saveSessions, loadActiveSessionId, saveActiveSessionId } from '@/lib/storage';

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Returns the step that should become in_progress after the given step completes */
function nextStepId(currentId: string): string {
  const order = ['planning', 'searching', 'processing', 'synthesizing'];
  const idx = order.indexOf(currentId);
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : '';
}

/** Build a minimal brief when AI synthesis is unavailable */
function buildFallbackBrief(problem: string, sources: SourceItem[]): ResearchBriefData {
  const topSources = sources.slice(0, 3);
  return {
    summary: `Research on "${problem}" retrieved ${sources.length} sources. ${topSources.length > 0
        ? `Top references include ${topSources.map((s) => `[${s.citationId}] ${s.title}`).join(', ')}.`
        : 'No sources retrieved — please check your API keys in .env.'
      } Add GEMINI_API_KEY (free at aistudio.google.com) in .env for a fully synthesized AI brief.`,
    approaches: [
      {
        approach: 'Manual Source Review',
        description: 'Review the retrieved sources directly in the right panel.',
        pros: ['Direct access to primary sources', 'No LLM hallucination risk'],
        cons: ['Requires manual synthesis', 'Time-intensive'],
        complexity: 'Low',
      },
    ],
    recommendedSolution: {
      title: 'Configure Free Gemini API Key for AI Synthesis',
      rationale: 'Add GEMINI_API_KEY (free at https://aistudio.google.com/apikey) to .env to enable AI-powered synthesis with inline citations.',
      tradeoffs: 'Without the key, sources are still retrieved — only the AI brief is missing.',
    },
    codeSnippets: [],
    keyPapersAndVideos: sources
      .filter((s) => s.type === 'papers')
      .slice(0, 3)
      .map((s) => ({
        title: s.title,
        url: s.url,
        type: 'paper' as const,
        takeaway: s.snippet.slice(0, 150),
        citationId: s.citationId,
      })),
    openQuestions: [
      'What specific aspect of this problem requires the most urgent attention?',
      'Are there existing libraries or frameworks that already solve this?',
    ],
  };
}

// ─── Main Component ─────────────────────────────────────────────────────────────

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

  // Sync sessions to localStorage and backend /api/sessions whenever sessions change
  useEffect(() => {
    if (isStorageLoaded) {
      saveSessions(sessions);
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions }),
      }).catch(() => {
        // Ignore background sync errors if offline
      });
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

  // Start research pipeline — consumes real SSE stream from /api/research
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
        description: 'Deconstructing your problem into specialized sub-queries for each source',
        status: 'in_progress',
        badge: 'Gemini AI',
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
        description: 'Normalizing URLs, filtering noise, and scoring by credibility',
        status: 'pending',
      },
      {
        id: 'synthesizing',
        name: 'Synthesizing Research Brief',
        description: 'Generating executive summary, approaches, pros/cons, and inline citations',
        status: 'pending',
        badge: 'Gemini AI',
      },
    ];
    setProgressSteps(initialSteps);
    setSourcesFoundCount(0);

    // Accumulators for the SSE stream
    let liveSources: SourceItem[] = [];
    const serverWarnings: string[] = [];
    let generatedSubQueries: SubQuery[] = [];
    let newSessionId = `sess-${Date.now()}`;
    let researchBrief: ResearchBriefData | null = null;

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem, selectedSources, depth }),
      });

      if (!response.body) throw new Error('No response body from /api/research');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split('\n');
          let eventType = '';
          let dataLine = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            if (line.startsWith('data: ')) dataLine = line.slice(6).trim();
          }
          if (!eventType || !dataLine) continue;

          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(dataLine);
          } catch {
            continue;
          }

          switch (eventType) {
            case 'step': {
              const { id, status, message } = payload as { id: string; status: string; message: string };
              setProgressSteps((prev) =>
                prev.map((step) =>
                  step.id === id
                    ? {
                      ...step,
                      status: status as ProgressStepItem['status'],
                      details: message,
                      ...(status === 'completed' && id === 'searching'
                        ? { badge: `${liveSources.length} sources retrieved` }
                        : {}),
                    }
                    : step.id === nextStepId(id) && status === 'completed'
                      ? { ...step, status: 'in_progress' }
                      : step
                )
              );
              break;
            }
            case 'queries': {
              const { queries } = payload as { queries: SubQuery[] };
              generatedSubQueries = queries;
              setActiveSubQueries(queries);
              break;
            }
            case 'sources': {
              const { sources } = payload as { sources: SourceItem[] };
              liveSources = sources;
              setSourcesFoundCount(sources.length);
              break;
            }
            case 'warning': {
              const { message } = payload as { message: string };
              serverWarnings.push(message);
              break;
            }
            case 'brief': {
              const { brief } = payload as { brief: ResearchBriefData };
              researchBrief = brief;
              break;
            }
            case 'done': {
              const { sessionId } = payload as { sessionId: string };
              newSessionId = sessionId;
              break;
            }
            case 'error': {
              const { message } = payload as { message: string };
              serverWarnings.push(`Error: ${message}`);
              console.error('[SSE Error]', message);
              break;
            }
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error connecting to research API';
      console.warn('[handleStartResearch] SSE fetch failed:', msg);
      serverWarnings.push(`Research pipeline warning: ${msg}`);
    }

    // Build the session
    const newTitle = problem.length > 50 ? `${problem.slice(0, 48)}…` : problem;

    // Fallback sources if nothing retrieved
    const finalSources: SourceItem[] =
      liveSources.length > 0
        ? liveSources
        : [
          {
            id: `src-fallback-1`,
            citationId: 1,
            type: 'web',
            title: 'MDN Web Docs — Technical Reference',
            url: 'https://developer.mozilla.org',
            snippet: `Reference documentation relevant to: ${problem.slice(0, 80)}`,
            date: new Date().toISOString().slice(0, 10),
            credibilityScore: 95,
          },
        ];

    // Fallback brief if Claude synthesis failed
    const finalBrief: ResearchBriefData = researchBrief || buildFallbackBrief(problem, finalSources);

    // Fallback sub-queries if planning failed
    const finalSubQueries: SubQuery[] =
      generatedSubQueries.length > 0
        ? generatedSubQueries
        : selectedSources.map((src, i) => ({
          id: `sq-${i + 1}`,
          sourceType: src,
          query: problem.slice(0, 60),
          purpose: `${src} search`,
        }));

    const newSession: ResearchSession = {
      id: newSessionId,
      title: newTitle,
      problem,
      depth,
      selectedSources,
      createdAt: new Date().toISOString(),
      status: serverWarnings.some((w) => w.startsWith('Error:')) ? 'error' : 'completed',
      subQueries: finalSubQueries,
      sources: finalSources,
      warnings: serverWarnings,
      brief: finalBrief,
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

  // Follow-up chat submission — real Claude-powered grounded Q&A
  const handleSendFollowUp = async (content: string) => {
    if (!activeSession) return;
    setIsFollowUpLoading(true);

    const userMsg: FollowUpMessage = {
      id: `fu-${Date.now()}-u`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    // Optimistically add the user message
    const updatedSession = {
      ...activeSession,
      followUps: [...activeSession.followUps, userMsg],
    };
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? updatedSession : s))
    );

    // Build conversation history for context (last 6 turns)
    const history = updatedSession.followUps
      .filter((m) => m.id !== userMsg.id) // exclude the one we just added
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    let assistantContent =
      'I could not connect to the AI service. Please ensure ANTHROPIC_API_KEY is set in .env and the dev server is running.';
    let citedSources: number[] = [];

    try {
      const res = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: content,
          sources: activeSession.sources,
          history,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        assistantContent = data.content || assistantContent;
        citedSources = Array.isArray(data.citedSources) ? data.citedSources : [];
      } else {
        const err = await res.json().catch(() => ({}));
        assistantContent = `Error: ${err.error || res.statusText}`;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      assistantContent = `Could not reach /api/followup: ${msg}`;
    }

    const assistantMsg: FollowUpMessage = {
      id: `fu-${Date.now()}-a`,
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date().toISOString(),
      citedSources,
    };

    const finalSession = {
      ...updatedSession,
      followUps: [...updatedSession.followUps, assistantMsg],
    };

    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === activeSession.id ? finalSession : s));
      saveSessions(updated);
      return updated;
    });
    setIsFollowUpLoading(false);
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
