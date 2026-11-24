'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  History, 
  Globe, 
  FileText, 
  MessageSquare, 
  Database
} from 'lucide-react';
import { GitHubIcon, YouTubeIcon } from '@/components/Icons';
import { ResearchSession, SourceType } from '@/types/research';
import { formatDate } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  sessions: ResearchSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewResearch: () => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onDeleteSession: (id: string) => void;
}

const sourceIconMap: Record<SourceType, React.ReactNode> = {
  web: <Globe className="w-3 h-3 text-sky-400" />,
  papers: <FileText className="w-3 h-3 text-purple-400" />,
  youtube: <YouTubeIcon className="w-3 h-3 text-red-400" />,
  reddit_hn: <MessageSquare className="w-3 h-3 text-orange-400" />,
  github: <GitHubIcon className="w-3 h-3 text-emerald-400" />,
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewResearch,
  onRenameSession,
  onDeleteSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.problem.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (session: ResearchSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this research session?')) {
      onDeleteSession(id);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-72 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 flex flex-col h-[calc(100vh-3.5rem)] sticky top-14">
      {/* Top action: New research */}
      <div className="p-3 border-b border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5">
        <button
          onClick={onNewResearch}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm hover:shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Research Session</span>
        </button>

        {/* Filter / Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search past research..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-md bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="flex items-center justify-between px-2 py-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <History className="w-3 h-3" />
            <span>Research History ({filteredSessions.length})</span>
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 px-4 text-xs text-zinc-400">
            {searchQuery ? "No matching sessions found." : "No past research sessions yet. Start one above!"}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const isEditing = editingId === session.id;

            return (
              <div
                key={session.id}
                onClick={() => !isEditing && onSelectSession(session.id)}
                className={`group relative rounded-lg p-2.5 text-xs cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-white dark:bg-zinc-800 border-indigo-300 dark:border-indigo-600 shadow-sm'
                    : 'border-transparent hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 hover:border-zinc-200 dark:hover:border-zinc-700/50'
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(session.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="flex-1 text-xs px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-indigo-500 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                    <button
                      onClick={(e) => handleSaveRename(session.id, e)}
                      className="p-1 text-emerald-500 hover:text-emerald-400"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleCancelRename}
                      className="p-1 text-zinc-400 hover:text-zinc-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1 pr-6">
                        {session.title}
                      </span>

                      {/* Hover action buttons */}
                      <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-700/80 rounded px-1 py-0.5 shadow-sm">
                        <button
                          onClick={(e) => startRename(session, e)}
                          className="p-1 text-zinc-500 hover:text-indigo-400 transition-colors"
                          title="Rename"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(session.id, e)}
                          className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-2">
                      {session.problem}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <div className="flex items-center gap-1">
                        {session.selectedSources.map((src) => (
                          <span key={src} title={src} className="opacity-75 hover:opacity-100">
                            {sourceIconMap[src]}
                          </span>
                        ))}
                      </div>
                      <span className="capitalize px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/40">
                        {session.depth}
                      </span>
                      <span>{formatDate(session.createdAt)}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Database className="w-3 h-3 text-emerald-400" />
          <span>Local Storage: SQLite Ready</span>
        </div>
        <span className="text-[10px] px-1 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500">
          v1.0
        </span>
      </div>
    </aside>
  );
};

