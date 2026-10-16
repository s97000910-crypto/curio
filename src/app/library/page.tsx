'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Plus, Search, ExternalLink, Download, ShieldCheck, Scale } from 'lucide-react';
import { Resource, ResourceLicense } from '@/lib/db/types';

export default function LibraryPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [licenses, setLicenses] = useState<ResourceLicense[]>([]);
  const [subject, setSubject] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const subjects = ['All', 'Mathematics', 'Physics', 'Computer Science', 'Philosophy'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Specialized'];

  const loadResources = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (subject !== 'All') params.append('subject', subject);
    if (difficulty !== 'All') params.append('difficulty', difficulty);
    if (search.trim()) params.append('search', search.trim());

    fetch(`/api/library?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.resources) setResources(data.resources);
        if (data.licenses) setLicenses(data.licenses);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadResources();
  }, [subject, difficulty]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadResources();
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-r from-amber-500/10 via-violet-500/10 to-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2">
            <BookOpen className="text-amber-500" />
            <span>Open Knowledge Library</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-xl">
            A curated, legally compliant repository of public-domain classics, open-access textbooks, notes, and foundational papers.
          </p>
        </div>
        <Link
          href="/library/submit"
          className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20 transition shrink-0"
        >
          <Plus size={16} />
          <span>Submit Open Resource</span>
        </Link>
      </div>

      {/* Legal & Compliance Notice */}
      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-[var(--text-muted)]">
        <Scale size={18} className="text-emerald-500 shrink-0" />
        <div>
          <strong className="text-[var(--text-main)]">Copyright Compliance:</strong> Curio hosts only verified public-domain, Creative Commons, and author-authorized materials. For all other works, legitimate external links are provided.
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Subject Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {subjects.map((sub) => {
            const active = subject === sub;
            return (
              <button
                key={sub}
                onClick={() => setSubject(sub)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                  active
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            placeholder="Search titles, authors, keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] pl-8 pr-3 py-1.5 text-xs text-[var(--text-main)]"
          />
        </form>
      </div>

      {/* Resource Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 animate-pulse space-y-3"
            >
              <div className="w-24 h-4 bg-[var(--bg-elevated)]" />
              <div className="w-3/4 h-5 bg-[var(--bg-elevated)]" />
              <div className="w-full h-16 bg-[var(--bg-elevated)]" />
            </div>
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <p className="text-xs text-[var(--text-muted)]">No resources match your current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((res) => (
            <div
              key={res.id}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-xs hover:border-[var(--border-subtle)]/80 flex flex-col justify-between transition group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                    {res.subject}
                  </span>
                  <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    {res.license?.code || 'Open License'}
                  </span>
                </div>

                <Link
                  href={`/library/${res.id}`}
                  className="text-sm font-bold text-[var(--text-main)] group-hover:text-amber-600 transition line-clamp-2 mb-1"
                >
                  {res.title}
                </Link>

                <div className="text-xs text-[var(--text-muted)] mb-2.5 font-medium">
                  by {res.author} {res.publication_year ? `(${res.publication_year})` : ''}
                </div>

                <p className="text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed mb-4">
                  {res.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-2xs text-[var(--text-muted)]">
                <span className="font-semibold">{res.difficulty_level}</span>
                <Link
                  href={`/library/${res.id}`}
                  className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <span>View Details</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
