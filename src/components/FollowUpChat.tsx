'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Loader2 
} from 'lucide-react';
import { FollowUpMessage, SourceItem } from '@/types/research';

interface FollowUpChatProps {
  messages: FollowUpMessage[];
  sources: SourceItem[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  onCitationClick?: (citationId: number) => void;
}

const SUGGESTIONS = [
  "How does this approach impact existing read replicas?",
  "What are the rollback procedures if deployment fails?",
  "Can you write a TypeScript / Go wrapper for this?",
  "What metric should we alert on in Prometheus / Datadog?",
];

export const FollowUpChat: React.FC<FollowUpChatProps> = ({
  messages,
  sources,
  onSendMessage,
  isLoading = false,
  onCitationClick,
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Helper for rendering citations inside messages
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(\[\d+(?:,\s*\d+)*\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[(\d+(?:,\s*\d+)*)\]/);
      if (match) {
        const numbers = match[1].split(',').map((n) => parseInt(n.trim(), 10));
        return (
          <span key={i} className="inline-flex items-center gap-0.5 mx-0.5">
            {numbers.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onCitationClick?.(num)}
                className="font-mono font-bold text-[10px] px-1 py-0.2 rounded bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
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

  return (
    <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            Follow-up Technical Q&A
          </h3>
        </div>
        <span className="text-[11px] text-zinc-400">
          Grounded strictly in retrieved sources ({sources.length})
        </span>
      </div>

      {/* Messages Thread */}
      <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Ask follow-up questions about performance, edge cases, implementation, or trade-offs.
            </p>
            {/* Suggestions */}
            <div className="flex flex-wrap justify-center gap-1.5 pt-2">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSendMessage(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 text-xs ${isUser ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`p-3.5 rounded-xl max-w-[85%] space-y-1.5 ${
                    isUser
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-none'
                      : 'bg-zinc-50 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/60 rounded-tl-none'
                  }`}
                >
                  <div className="leading-relaxed whitespace-pre-wrap">
                    {renderMessageContent(msg.content)}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Analyzing collected sources...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative pt-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Ask a follow-up question (e.g., 'What happens if statement_timeout expires?')..."
          className="w-full text-xs p-3 pr-12 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute right-3 bottom-3 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all shadow-sm"
          title="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

