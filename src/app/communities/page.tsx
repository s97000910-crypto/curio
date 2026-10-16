'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Plus, Search, ArrowRight, Check, Compass, Sparkles } from 'lucide-react';
import { Community, Profile } from '@/lib/db/types';
import { CommunityCover } from '@/components/communities/CommunityCover';
import { CommunityAvatar } from '@/components/communities/CommunityAvatar';

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRules, setNewRules] = useState('');
  const [newCategory, setNewCategory] = useState('Mathematics');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'All',
    'Mathematics',
    'Science and technology',
    'Humanities and arts',
    'Other curiosities',
  ];

  const loadCommunities = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== 'All') params.append('category', category);

    fetch(`/api/communities?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.communities) {
          setCommunities(data.communities);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch('/api/auth')
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.currentUser))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadCommunities();
  }, [category]);

  const handleToggleJoin = async (slug: string) => {
    try {
      const res = await fetch(`/api/communities/${slug}/join`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setCommunities((prev) =>
          prev.map((c) =>
            c.slug === slug ? { ...c, is_member: data.joined, member_count: data.member_count } : c
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          slug: newSlug || newName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          description: newDescription,
          rules: newRules || '1. Be intellectually generous. 2. No AI generated content.',
          category: newCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create community');

      setShowCreateModal(false);
      loadCommunities();
    } catch (err: any) {
      setError(err.message || 'Error creating community');
    } finally {
      setCreating(false);
    }
  };

  const filteredCommunities = communities.filter((c) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.description.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-r from-violet-600/10 via-pink-500/10 to-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2">
            <Users className="text-violet-600" />
            <span>Subject Communities</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Dedicated spaces for in-depth inquiries, foundational derivations, and discussions.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-500/20 transition"
        >
          <Plus size={16} />
          <span>New Community</span>
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                  active
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            placeholder="Search communities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] pl-8 pr-3 py-1.5 text-xs text-[var(--text-main)]"
          />
        </div>
      </div>

      {/* Communities Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-8">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 animate-pulse space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)]" />
              <div className="w-32 h-4 bg-[var(--bg-elevated)]" />
              <div className="w-full h-12 bg-[var(--bg-elevated)]" />
            </div>
          ))}
        </div>
      ) : filteredCommunities.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-12 text-center">
          <p className="text-xs text-[var(--text-muted)]">No communities match your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCommunities.map((c, index) => (
            <div
              key={c.id}
              className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xs hover:border-[var(--border-subtle)]/80 flex flex-col justify-between transition group"
            >
              <CommunityCover community={c} className="h-28 sm:h-32" eager={index === 0} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <CommunityAvatar community={c} className="h-11 w-11 rounded-2xl text-lg font-black shadow-xs" />
                    <div>
                      <Link
                        href={`/c/${c.slug}`}
                        className="text-base font-bold text-[var(--text-main)] group-hover:text-violet-600 transition"
                      >
                        {c.name}
                      </Link>
                      <div className="text-3xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        {c.category}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleJoin(c.slug)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      c.is_member
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-violet-600 text-white hover:bg-violet-700'
                    }`}
                  >
                    {c.is_member ? (
                      <>
                        <Check size={12} />
                        <span>Joined</span>
                      </>
                    ) : (
                      <span>Join</span>
                    )}
                  </button>
                </div>

                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4 line-clamp-2">
                  {c.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-2xs text-[var(--text-muted)]">
                <div className="flex items-center gap-3">
                  <span>
                    <strong className="text-[var(--text-main)]">{c.member_count}</strong> members
                  </span>
                  <span>
                    <strong className="text-[var(--text-main)]">{c.post_count}</strong> posts
                  </span>
                </div>
                <Link
                  href={`/c/${c.slug}`}
                  className="flex items-center gap-1 font-bold text-violet-600 dark:text-violet-400 hover:underline"
                >
                  <span>Enter</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Community Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-1">Create a Subject Community</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Foster thoughtful discussions around a specific field of inquiry.
            </p>

            <form onSubmit={handleCreateCommunity} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Community Name</label>
                <input
                  type="text"
                  placeholder="e.g. Analytic Number Theory"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science and technology">Science and technology</option>
                  <option value="Humanities and arts">Humanities and arts</option>
                  <option value="Other curiosities">Other curiosities</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="What is this community's focus and mission?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Rules & Norms</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 1. Show all derivations. 2. Be intellectually generous."
                  value={newRules}
                  onChange={(e) => setNewRules(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                />
              </div>

              {error && <div className="text-xs text-rose-500">{error}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium border border-[var(--border-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 text-white disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
