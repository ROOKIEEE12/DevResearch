'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Code2, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  Flame,
  AlertTriangle
} from 'lucide-react';
import { ResearchSession } from '@/types/research';
import { formatDate } from '@/lib/utils';

interface ResearchBriefProps {
  session: ResearchSession;
  onCitationClick: (citationId: number) => void;
  onOpenExportModal: () => void;
}

export const ResearchBrief: React.FC<ResearchBriefProps> = ({
  session,
  onCitationClick,
  onOpenExportModal,
}) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const brief = session.brief;

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Helper to render text with clickable [1], [2] citation badges
  const renderTextWithCitations = (text: string) => {
    const parts = text.split(/(\[\d+(?:,\s*\d+)*\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[(\d+(?:,\s*\d+)*)\]/);
      if (match) {
        const numbers = match[1].split(',').map((n) => parseInt(n.trim(), 10));
        return (
          <span key={i} className="inline-flex items-center gap-0.5 mx-0.5 align-baseline">
            {numbers.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onCitationClick(num)}
                className="inline-flex items-center justify-center font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors shadow-xs"
                title={`Jump to Source [${num}]`}
              >
                [{num}]
              </button>
            ))}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!brief) {
    return (
      <div className="p-8 text-center text-zinc-400">
        No brief generated for this session yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brief Header */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Depth: {session.depth}
            </span>
            <span suppressHydrationWarning className="text-xs text-zinc-400">
              {formatDate(session.createdAt)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenExportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Brief</span>
            </button>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 leading-tight">
          {session.title}
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-50 dark:bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
          <strong>Problem Context:</strong> {session.problem}
        </p>

        {session.warnings && session.warnings.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Source Connector Notices:</span>
            </div>
            <ul className="list-disc list-inside text-[11px] space-y-0.5 opacity-90 pl-1">
              {session.warnings.map((w, wIdx) => (
                <li key={wIdx}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 1. Executive Summary */}
      <section className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <Sparkles className="w-4 h-4" />
          <span>1. Executive Summary</span>
        </div>
        <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed space-y-2">
          {renderTextWithCitations(brief.summary)}
        </div>
      </section>

      {/* 2. Recommended Solution */}
      <section className="p-5 rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-br from-indigo-500/5 via-transparent to-cyan-500/5 dark:bg-zinc-900/90 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Flame className="w-4 h-4 text-indigo-500" />
            <span>2. Recommended Solution</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            High Confidence
          </span>
        </div>

        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          {brief.recommendedSolution.title}
        </h3>

        <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {renderTextWithCitations(brief.recommendedSolution.rationale)}
        </div>

        {brief.recommendedSolution.architectureNotes && (
          <div className="text-xs p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-1">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">Architecture Considerations:</span>
            <p className="text-zinc-600 dark:text-zinc-400">{brief.recommendedSolution.architectureNotes}</p>
          </div>
        )}

        <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
          <strong>Tradeoffs to Watch:</strong> {brief.recommendedSolution.tradeoffs}
        </div>
      </section>

      {/* 3. Possible Approaches (Pros & Cons) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
          <FileText className="w-4 h-4" />
          <span>3. Evaluated Approaches & Tradeoffs</span>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {brief.approaches.map((app, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Option {idx + 1}: {app.approach}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {app.description}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                  app.complexity === 'Low'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-500/20'
                    : app.complexity === 'Medium'
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-500/20'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-500/20'
                }`}>
                  {app.complexity} Complexity
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
                {/* Pros */}
                <div className="space-y-1.5 p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Advantages</span>
                  </span>
                  <ul className="space-y-1 text-zinc-600 dark:text-zinc-300 text-[11px]">
                    {app.pros.map((p, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-1">
                        <span className="text-emerald-500 shrink-0">+</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cons */}
                <div className="space-y-1.5 p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-500/20">
                  <span className="font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Disadvantages & Risks</span>
                  </span>
                  <ul className="space-y-1 text-zinc-600 dark:text-zinc-300 text-[11px]">
                    {app.cons.map((c, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-1">
                        <span className="text-rose-500 shrink-0">-</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Implementation Code Snippets */}
      {brief.codeSnippets?.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
            <Code2 className="w-4 h-4 text-cyan-500" />
            <span>4. Implementation Code Snippets</span>
          </div>

          <div className="space-y-4">
            {brief.codeSnippets.map((snippet, sIdx) => (
              <div
                key={sIdx}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-950 text-zinc-100 shadow-md"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200">{snippet.title}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-400 border border-zinc-700">
                      {snippet.language}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyCode(snippet.code, sIdx)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    {copiedCodeIdx === sIdx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Code block */}
                <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed bg-[#0d1117] text-zinc-200">
                  <pre>{snippet.code}</pre>
                </div>

                {/* Explanation */}
                {snippet.explanation && (
                  <div className="px-4 py-2 bg-zinc-900/70 border-t border-zinc-800 text-[11px] text-zinc-400">
                    {snippet.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Key Papers & References */}
      {brief.keyPapersAndVideos?.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
            <ExternalLink className="w-4 h-4 text-purple-500" />
            <span>5. Key Papers, Videos & Deep Dives</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {brief.keyPapersAndVideos.map((item, kIdx) => (
              <div
                key={kIdx}
                className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-xs space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                    [{item.citationId}]
                  </span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    {item.type}
                  </span>
                </div>

                <h5 className="font-semibold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                    <span>{item.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                  </a>
                </h5>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {item.takeaway}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Open Questions & Edge Cases */}
      {brief.openQuestions?.length > 0 && (
        <section className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <HelpCircle className="w-4 h-4" />
            <span>6. Open Questions & Production Edge Cases</span>
          </div>

          <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
            {brief.openQuestions.map((q, qIdx) => (
              <li key={qIdx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

