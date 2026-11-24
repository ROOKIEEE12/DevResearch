'use client';

import React from 'react';
import { 
  Globe, 
  FileText, 
  MessageSquare, 
  ExternalLink, 
  Star, 
  Quote, 
  Calendar, 
  ShieldCheck,
  User
} from 'lucide-react';
import { GitHubIcon, YouTubeIcon } from '@/components/Icons';
import { SourceItem, SourceType } from '@/types/research';

interface SourceCardProps {
  source: SourceItem;
  isHighlighted?: boolean;
  onSelect?: (source: SourceItem) => void;
}

const sourceConfig: Record<SourceType, { label: string; icon: React.ReactNode; color: string; badge: string }> = {
  web: {
    label: 'Web & Docs',
    icon: <Globe className="w-3.5 h-3.5" />,
    color: 'text-sky-500',
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  },
  papers: {
    label: 'arXiv / Paper',
    icon: <FileText className="w-3.5 h-3.5" />,
    color: 'text-purple-500',
    badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  github: {
    label: 'GitHub',
    icon: <GitHubIcon className="w-3.5 h-3.5" />,
    color: 'text-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  reddit_hn: {
    label: 'Reddit / HN',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    color: 'text-orange-500',
    badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  },
  youtube: {
    label: 'YouTube Transcript',
    icon: <YouTubeIcon className="w-3.5 h-3.5" />,
    color: 'text-red-500',
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  },
};

export const SourceCard: React.FC<SourceCardProps> = ({
  source,
  isHighlighted = false,
  onSelect,
}) => {
  const conf = sourceConfig[source.type] || sourceConfig.web;

  return (
    <div
      id={`source-${source.citationId}`}
      onClick={() => onSelect?.(source)}
      className={`rounded-xl p-3.5 border transition-all text-xs space-y-2.5 ${
        isHighlighted
          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-md ring-2 ring-indigo-500/30'
          : 'bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs'
      }`}
    >
      {/* Top Header: Citation badge + Type badge + Credibility */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center justify-center font-mono font-bold w-5 h-5 rounded-md bg-indigo-600 text-white text-[10px] shadow-xs">
            [{source.citationId}]
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${conf.badge}`}>
            {conf.icon}
            <span>{conf.label}</span>
          </span>
        </div>

        {source.credibilityScore && (
          <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400" title={`Credibility rating: ${source.credibilityScore}%`}>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{source.credibilityScore}%</span>
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-start gap-1"
        >
          <span>{source.title}</span>
          <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 opacity-60" />
        </a>
      </h4>

      {/* Snippet */}
      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3 bg-zinc-50 dark:bg-zinc-950/60 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
        &ldquo;{source.snippet}&rdquo;
      </p>

      {/* Metadata footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-2">
          {source.date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{source.date}</span>
            </span>
          )}
          {source.author && (
            <span className="flex items-center gap-1 max-w-[140px] truncate" title={source.author}>
              <User className="w-3 h-3" />
              <span className="truncate">{source.author}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {source.metadata?.stars !== undefined && (
            <span className="flex items-center gap-0.5 text-amber-500">
              <Star className="w-3 h-3 fill-amber-500" />
              <span>{source.metadata.stars.toLocaleString()}</span>
            </span>
          )}
          {source.metadata?.citationCount !== undefined && (
            <span className="flex items-center gap-0.5 text-purple-400">
              <Quote className="w-3 h-3" />
              <span>{source.metadata.citationCount} cites</span>
            </span>
          )}
          {source.metadata?.score !== undefined && (
            <span className="text-orange-400 font-medium">
              +{source.metadata.score} pts
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

