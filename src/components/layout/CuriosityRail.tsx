'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, BookOpen, ArrowRight, ShieldCheck, Flame, Compass } from 'lucide-react';
import { Community } from '@/lib/db/types';

export const CuriosityRail: React.FC = () => {
  const [communities, setCommunities] = useState<Community[]>([]);

  useEffect(() => {
    fetch('/api/communities')
      .then((r) => r.json())
      .then((data) => {
        if (data.communities) {
          setCommunities(data.communities.slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <aside className="w-80 shrink-0 hidden xl:block space-y-5 sticky top-20 self-start pb-8">
      {/* Human Powered Guarantee */}
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
          <ShieldCheck size={16} />
          <span>Human-Powered Guarantee</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Curio contains <strong className="text-[var(--text-main)]">0% AI generated answers</strong>. Every
          proof, explanation, reading guide, and note is authored by curious humans.
        </p>
      </div>

      {/* Featured Communities */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <Compass size={14} className="text-[var(--curio-coral)]" />
            <span>Active Communities</span>
          </h3>
          <Link href="/communities" className="text-3xs text-[var(--curio-coral)] font-bold hover:underline">
            View All
          </Link>
        </div>

        <div className="space-y-2">
          {communities.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.slug}`}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--bg-elevated)] transition group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                  style={{ backgroundColor: `${c.color}20`, color: c.color }}
                >
                  {c.name.charAt(0)}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-[var(--text-main)] group-hover:text-[var(--curio-coral)] transition truncate">
                    {c.name}
                  </div>
                  <div className="text-3xs text-[var(--text-muted)]">{c.member_count} members</div>
                </div>
              </div>
              <ArrowRight size={12} className="text-[var(--text-muted)] group-hover:translate-x-0.5 transition" />
            </Link>
          ))}
        </div>
      </div>

      {/* Curated Open Library Spotlight */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
          <BookOpen size={14} />
          <span>Open Library Spotlight</span>
        </div>
        <div>
          <h4 className="text-xs font-bold text-[var(--text-main)]">
            Euclid’s Elements (Oliver Byrne 1847)
          </h4>
          <p className="text-2xs text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
            The mathematical masterpiece with geometric proofs illustrated in colored primary diagrams instead of lettered points.
          </p>
        </div>
        <Link
          href="/library/res_euclid"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--curio-coral)] hover:underline"
        >
          <span>Read Oliver Byrne Edition</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </aside>
  );
};
