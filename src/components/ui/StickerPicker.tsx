'use client';

import React from 'react';

export interface Sticker {
  code: string;
  label: string;
  emoji: string;
  color: string;
  quote?: string;
}

export const CURIO_STICKERS: Sticker[] = [
  { code: 'eureka', label: 'Eureka!', emoji: '⚡', color: '#F59E0B', quote: 'Found it! (Archimedes)' },
  { code: 'lightbulb', label: 'Epiphany', emoji: '💡', color: '#8B5CF6', quote: 'A new conceptual connection' },
  { code: 'integral', label: 'Rigorous Proof', emoji: '∫', color: '#0EA5E9', quote: 'Epsilon-Delta derived' },
  { code: 'apple', label: 'Gravity Spark', emoji: '🍎', color: '#EF4444', quote: 'Hypotheses non fingo' },
  { code: 'turing', label: 'Decidable', emoji: '💾', color: '#10B981', quote: 'Universal state machine' },
  { code: 'schrodinger', label: 'Superposition', emoji: '🐱', color: '#EC4899', quote: 'Both until observed' },
  { code: 'owl', label: 'Owl of Athena', emoji: '🦉', color: '#6366F1', quote: 'Wisdom at dusk' },
  { code: 'compass', label: 'Straightedge', emoji: '📐', color: '#14B8A6', quote: 'Euclidean constructible' },
  { code: 'prism', label: 'Optics', emoji: '🌈', color: '#F97316', quote: 'Separating the spectra' },
];

interface StickerPickerProps {
  selected?: string;
  onSelect: (code: string) => void;
}

export const StickerPicker: React.FC<StickerPickerProps> = ({ selected, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2 py-2">
      {CURIO_STICKERS.map((s) => {
        const isSelected = selected === s.code;
        return (
          <button
            key={s.code}
            type="button"
            onClick={() => onSelect(isSelected ? '' : s.code)}
            title={s.quote || s.label}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isSelected
                ? 'ring-2 ring-offset-1 ring-violet-500 scale-105 shadow-sm'
                : 'hover:scale-102 opacity-80 hover:opacity-100'
            }`}
            style={{
              backgroundColor: `${s.color}15`,
              color: s.color,
              borderColor: `${s.color}40`,
              borderWidth: 1,
            }}
          >
            <span className="text-sm">{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export const StickerBadge: React.FC<{ code: string }> = ({ code }) => {
  const sticker = CURIO_STICKERS.find((s) => s.code === code);
  if (!sticker) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs"
      style={{
        backgroundColor: `${sticker.color}20`,
        color: sticker.color,
        border: `1px solid ${sticker.color}50`,
      }}
      title={sticker.quote || sticker.label}
    >
      <span>{sticker.emoji}</span>
      <span>{sticker.label}</span>
    </span>
  );
};
