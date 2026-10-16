'use client';

import React from 'react';
import { Compass, Clock, Heart } from 'lucide-react';
import { PostType } from '@/lib/db/types';

interface FeedFiltersProps {
  filter: 'explore' | 'recent' | 'following';
  onFilterChange: (f: 'explore' | 'recent' | 'following') => void;
  selectedPostType?: PostType;
  onPostTypeChange: (pt?: PostType) => void;
}

export const FeedFilters: React.FC<FeedFiltersProps> = ({
  filter,
  onFilterChange,
  selectedPostType,
  onPostTypeChange,
}) => {
  return (
    <div className="mb-5 space-y-3">
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => onFilterChange('explore')}
            aria-pressed={filter === 'explore'}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 ${
              filter === 'explore'
                ? 'bg-[var(--curio-coral)] text-white shadow-md shadow-[var(--curio-coral)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Compass size={14} />
            <span>For you</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('recent')}
            aria-pressed={filter === 'recent'}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 ${
              filter === 'recent'
                ? 'bg-[var(--curio-coral)] text-white shadow-md shadow-[var(--curio-coral)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Clock size={14} />
            <span>Fresh</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('following')}
            aria-pressed={filter === 'following'}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 ${
              filter === 'following'
                ? 'bg-[var(--curio-coral)] text-white shadow-md shadow-[var(--curio-coral)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Heart size={14} />
            <span>Following</span>
          </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onPostTypeChange(undefined)}
            aria-pressed={!selectedPostType}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
              !selectedPostType
                ? 'bg-[var(--text-main)] text-[var(--bg-card)]'
                : 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-violet-400/60 hover:text-[var(--text-main)]'
            }`}
          >
            All Types
          </button>
          {[
            { type: 'discovery', label: 'Discoveries' },
            { type: 'question', label: 'Questions' },
            { type: 'poll', label: 'Polls' },
            { type: 'meme', label: 'Humor' },
          ].map((t) => {
            const active = selectedPostType === t.type;
            return (
              <button
                key={t.type}
                type="button"
                onClick={() => onPostTypeChange(active ? undefined : (t.type as PostType))}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  active
                    ? 'border border-[var(--curio-coral)]/30 bg-[var(--curio-coral)]/10 font-bold text-[var(--curio-coral)]'
                    : 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-violet-400/60 hover:text-[var(--text-main)]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
      </div>
    </div>
  );
};
