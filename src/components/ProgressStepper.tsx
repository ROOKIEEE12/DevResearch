'use client';

import React from 'react';
import { 
  CheckCircle2, 
  Loader2, 
  XCircle,
  Tag,
  Sparkles
} from 'lucide-react';
import { SubQuery } from '@/types/research';

export interface ProgressStepItem {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  details?: string;
  badge?: string;
}

interface ProgressStepperProps {
  currentStage?: string;
  steps: ProgressStepItem[];
  subQueries?: SubQuery[];
  sourcesFoundCount?: number;
  onCancel?: () => void;
}

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  steps,
  subQueries = [],
  sourcesFoundCount = 0,
  onCancel,
}) => {
  return (
    <div className="max-w-3xl mx-auto my-8 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">
              DevResearch Deep Engine Active
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Querying multi-source technical APIs and synthesizing findings
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map((step) => {
          const isDone = step.status === 'completed';
          const isCurrent = step.status === 'in_progress';
          const isPending = step.status === 'pending';
          const isError = step.status === 'error';

          return (
            <div
              key={step.id}
              className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/50 shadow-sm'
                  : isDone
                  ? 'bg-zinc-50/50 dark:bg-zinc-800/20 border-zinc-200/60 dark:border-zinc-800'
                  : 'border-transparent opacity-50'
              }`}
            >
              <div className="mt-0.5">
                {isDone && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {isCurrent && <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />}
                {isPending && <div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-700" />}
                {isError && <XCircle className="w-5 h-5 text-red-500" />}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                    {step.name}
                  </span>
                  {step.badge && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {step.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {step.description}
                </p>

                {/* Sub-queries preview during planning step */}
                {step.id === 'planning' && subQueries.length > 0 && (
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {subQueries.map((sq) => (
                      <div
                        key={sq.id}
                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-[10px] text-zinc-700 dark:text-zinc-300"
                      >
                        <Tag className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                        <span className="font-semibold uppercase text-[9px] text-zinc-400">{sq.sourceType}:</span>
                        <span className="truncate">{sq.query}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <span>Sources Discovered: <strong className="text-zinc-800 dark:text-zinc-200">{sourcesFoundCount}</strong></span>
        <span className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Real-time Anthropic Claude streaming</span>
        </span>
      </div>
    </div>
  );
};

