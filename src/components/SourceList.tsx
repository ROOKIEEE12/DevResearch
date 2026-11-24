'use client';

import React, { useState } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  Layers, 
  Globe, 
  FileText, 
  MessageSquare
} from 'lucide-react';
import { GitHubIcon, YouTubeIcon } from '@/components/Icons';
import { SourceItem, SourceType } from '@/types/research';
import { SourceCard } from './SourceCard';

interface SourceListProps {
  sources: SourceItem[];
  highlightedCitationId: number | null;
  onSelectCitation?: (citationId: number) => void;
}

type FilterType = 'all' | SourceType;
type SortType = 'credibility' | 'recency' | 'citation';

export const SourceList: React.FC<SourceListProps> = ({
  sources,
  highlightedCitationId,
  onSelectCitation,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('citation');

  // Counts by source type
  const counts: Record<FilterType, number> = {
    all: sources.length,
    web: sources.filter((s) => s.type === 'web').length,
    papers: sources.filter((s) => s.type === 'papers').length,
    github: sources.filter((s) => s.type === 'github').length,
    reddit_hn: sources.filter((s) => s.type === 'reddit_hn').length,
    youtube: sources.filter((s) => s.type === 'youtube').length,
  };

  // Filter & search
  const filtered = sources.filter((s) => {
    if (filter !== 'all' && s.type !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.snippet.toLowerCase().includes(q) ||
        (s.author && s.author.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'credibility') {
      return (b.credibilityScore || 0) - (a.credibilityScore || 0);
    }
    if (sortBy === 'recency') {
      return new Date(b.date || '1970').getTime() - new Date(a.date || '1970').getTime();
    }
    return a.citationId - b.citationId;
  });

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Header & Controls */}
      <div className="space-y-2.5 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Evidence Sources ({sources.length})
            </h3>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
            <SlidersHorizontal className="w-3 h-3" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="bg-transparent border-0 text-zinc-700 dark:text-zinc-300 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="citation">Citation Order</option>
              <option value="credibility">Highest Credibility</option>
              <option value="recency">Most Recent</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search within collected sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
              filter === 'all'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            All ({counts.all})
          </button>
          {counts.web > 0 && (
            <button
              onClick={() => setFilter('web')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                filter === 'web'
                  ? 'bg-sky-500 text-white'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <Globe className="w-2.5 h-2.5" />
              <span>Web ({counts.web})</span>
            </button>
          )}
          {counts.papers > 0 && (
            <button
              onClick={() => setFilter('papers')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                filter === 'papers'
                  ? 'bg-purple-500 text-white'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <FileText className="w-2.5 h-2.5" />
              <span>Papers ({counts.papers})</span>
            </button>
          )}
          {counts.github > 0 && (
            <button
              onClick={() => setFilter('github')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                filter === 'github'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <GitHubIcon className="w-2.5 h-2.5" />
              <span>GitHub ({counts.github})</span>
            </button>
          )}
          {counts.reddit_hn > 0 && (
            <button
              onClick={() => setFilter('reddit_hn')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                filter === 'reddit_hn'
                  ? 'bg-orange-500 text-white'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <MessageSquare className="w-2.5 h-2.5" />
              <span>Reddit/HN ({counts.reddit_hn})</span>
            </button>
          )}
          {counts.youtube > 0 && (
            <button
              onClick={() => setFilter('youtube')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                filter === 'youtube'
                  ? 'bg-red-500 text-white'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <YouTubeIcon className="w-2.5 h-2.5" />
              <span>YouTube ({counts.youtube})</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards list */}
      <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-14rem)] pr-1">
        {sorted.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-400 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
            No sources match the selected filter.
          </div>
        ) : (
          sorted.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              isHighlighted={highlightedCitationId === source.citationId}
              onSelect={() => onSelectCitation?.(source.citationId)}
            />
          ))
        )}
      </div>
    </div>
  );
};

