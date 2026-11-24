'use client';

import React, { useState } from 'react';
import { 
  Globe, 
  FileText, 
  MessageSquare, 
  Zap, 
  Gauge, 
  Compass, 
  Sparkles, 
  ArrowRight, 
  X, 
  Layers, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { GitHubIcon, YouTubeIcon } from '@/components/Icons';
import { ResearchDepth, SourceType } from '@/types/research';
import { SAMPLE_QUERIES } from '@/lib/mock-data';

interface SearchInputProps {
  onStartResearch: (problem: string, sources: SourceType[], depth: ResearchDepth) => void;
  isSubmitting?: boolean;
}

interface SourceOption {
  type: SourceType;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
}

const SOURCES: SourceOption[] = [
  {
    type: 'web',
    label: 'Web & Docs',
    sublabel: 'Official docs, StackOverflow, Brave/Tavily',
    icon: <Globe className="w-4 h-4" />,
    color: 'border-sky-500/50 text-sky-500 bg-sky-500/10',
  },
  {
    type: 'papers',
    label: 'Research Papers',
    sublabel: 'arXiv + Semantic Scholar',
    icon: <FileText className="w-4 h-4" />,
    color: 'border-purple-500/50 text-purple-500 bg-purple-500/10',
  },
  {
    type: 'github',
    label: 'GitHub',
    sublabel: 'Issues, commits, discussions',
    icon: <GitHubIcon className="w-4 h-4" />,
    color: 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10',
  },
  {
    type: 'reddit_hn',
    label: 'Reddit & Hacker News',
    sublabel: 'Production incidents, engineering debates',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'border-orange-500/50 text-orange-500 bg-orange-500/10',
  },
  {
    type: 'youtube',
    label: 'YouTube Transcripts',
    sublabel: 'Tech conferences, deep dives, talks',
    icon: <YouTubeIcon className="w-4 h-4" />,
    color: 'border-red-500/50 text-red-500 bg-red-500/10',
  },
];

const DEPTH_OPTIONS: Array<{
  depth: ResearchDepth;
  label: string;
  desc: string;
  time: string;
  icon: React.ReactNode;
}> = [
  {
    depth: 'quick',
    label: 'Quick Scan',
    desc: 'Targeted web & GitHub sweep',
    time: '~30-60s',
    icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,
  },
  {
    depth: 'standard',
    label: 'Standard',
    desc: 'Balanced cross-source query planning',
    time: '~1-2m',
    icon: <Gauge className="w-3.5 h-3.5 text-indigo-500" />,
  },
  {
    depth: 'deep',
    label: 'Deep Research',
    desc: 'Full academic papers, transcripts & code search',
    time: '~2-4m',
    icon: <Compass className="w-3.5 h-3.5 text-cyan-500" />,
  },
];

export const SearchInput: React.FC<SearchInputProps> = ({
  onStartResearch,
  isSubmitting = false,
}) => {
  const [problem, setProblem] = useState('');
  const [selectedSources, setSelectedSources] = useState<SourceType[]>([
    'web',
    'papers',
    'github',
    'reddit_hn',
    'youtube',
  ]);
  const [depth, setDepth] = useState<ResearchDepth>('standard');
  const [errorWarning, setErrorWarning] = useState<string | null>(null);

  const toggleSource = (source: SourceType) => {
    setErrorWarning(null);
    if (selectedSources.includes(source)) {
      if (selectedSources.length === 1) {
        setErrorWarning('Select at least one source connector.');
        return;
      }
      setSelectedSources(selectedSources.filter((s) => s !== source));
    } else {
      setSelectedSources([...selectedSources, source]);
    }
  };

  const selectAllSources = () => {
    setSelectedSources(['web', 'papers', 'github', 'reddit_hn', 'youtube']);
    setErrorWarning(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!problem.trim()) {
      setErrorWarning('Please describe your technical problem first.');
      return;
    }
    if (selectedSources.length === 0) {
      setErrorWarning('Select at least one source connector.');
      return;
    }
    setErrorWarning(null);
    onStartResearch(problem.trim(), selectedSources, depth);
  };

  const applySampleQuery = (sample: typeof SAMPLE_QUERIES[0]) => {
    setProblem(sample.description);
    setDepth(sample.depth);
    setSelectedSources([...sample.sources]);
    setErrorWarning(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          <span>Multi-source technical synthesis for engineers</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          What complex technical problem are you solving?
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          DevResearch analyzes papers, GitHub issues, production incidents, video transcripts, and official documentation to return a single, cited synthesis.
        </p>
      </div>

      {/* Main Search Card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-xl shadow-zinc-200/50 dark:shadow-black/40 overflow-hidden transition-all">
        {/* Problem Textarea */}
        <div className="p-4 sm:p-6 relative">
          <textarea
            value={problem}
            onChange={(e) => {
              setProblem(e.target.value);
              if (errorWarning) setErrorWarning(null);
            }}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder="Describe your technical problem in detail (e.g., PostgreSQL autovacuum deadlocks during concurrent partition detach under heavy INSERT traffic in PG 15...)"
            className="w-full text-base sm:text-lg bg-transparent border-0 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none resize-none leading-relaxed"
          />

          {problem && (
            <button
              onClick={() => setProblem('')}
              className="absolute right-6 top-6 p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-400">
            <span>Be specific about versions, error messages, and architectures.</span>
            <span className="hidden sm:inline font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
              Ctrl + Enter to run
            </span>
          </div>
        </div>

        {/* Source Toggles Bar */}
        <div className="px-4 sm:px-6 py-4 bg-zinc-50/70 dark:bg-zinc-950/40 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Target Sources ({selectedSources.length}/{SOURCES.length})</span>
            </span>
            <button
              type="button"
              onClick={selectAllSources}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Select all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {SOURCES.map((src) => {
              const isSelected = selectedSources.includes(src.type);
              return (
                <button
                  key={src.type}
                  type="button"
                  onClick={() => toggleSource(src.type)}
                  className={`flex flex-col text-left p-2.5 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? 'border-indigo-500/60 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 opacity-60 hover:opacity-90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="p-1 rounded-md bg-white dark:bg-zinc-800 shadow-xs border border-zinc-200/60 dark:border-zinc-700/60">
                      {src.icon}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{src.label}</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1">{src.sublabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Depth & Action Controls */}
        <div className="px-4 sm:px-6 py-4 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-zinc-200/80 dark:border-zinc-800/80">
          {/* Depth Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60">
            {DEPTH_OPTIONS.map((opt) => {
              const isSelected = depth === opt.depth;
              return (
                <button
                  key={opt.depth}
                  type="button"
                  onClick={() => setDepth(opt.depth)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/80 dark:border-zinc-700'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                  title={`${opt.desc} (${opt.time})`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                  <span className="text-[10px] opacity-60 font-mono hidden md:inline">{opt.time}</span>
                </button>
              );
            })}
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !problem.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <span>Start Research</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Warning Alert */}
      {errorWarning && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorWarning}</span>
        </div>
      )}

      {/* Sample Technical Queries */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Try real developer queries</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {SAMPLE_QUERIES.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applySampleQuery(sample)}
              className="text-left p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:border-indigo-400/60 dark:hover:border-indigo-600 transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {sample.title}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                  {sample.depth}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                {sample.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

