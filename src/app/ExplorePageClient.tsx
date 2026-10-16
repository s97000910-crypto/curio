'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FeedFilters } from '@/components/feed/FeedFilters';
import { PostCard } from '@/components/feed/PostCard';
import { CuriosityRail } from '@/components/layout/CuriosityRail';
import { Post, PostType, Profile } from '@/lib/db/types';
import { ArrowRight, Compass, RefreshCw, Sparkles } from 'lucide-react';

export default function ExplorePageClient() {
  const [filter, setFilter] = useState<'explore' | 'recent' | 'following'>('explore');
  const [postType, setPostType] = useState<PostType | undefined>(undefined);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedAttempt, setFeedAttempt] = useState(0);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load your profile.');
        setCurrentUser(data.currentUser);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error('Failed to load the current profile:', error);
        setProfileError(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ filter });
    if (postType) params.set('postType', postType);
    if (selectedTopic) params.set('topic', selectedTopic);

    fetch(`/api/posts?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const data: { posts?: Post[]; error?: string } = await response.json();
        if (!response.ok) {
          throw new Error(response.status < 500 ? data.error || 'Could not load the feed.' : 'Please try again in a moment.');
        }
        if (!Array.isArray(data.posts)) throw new Error('The feed response was incomplete.');
        setPosts(data.posts);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error('Failed to load the feed:', error);
        setFeedError(error instanceof Error ? error.message : 'Could not load the feed.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filter, postType, selectedTopic, feedAttempt]);

  const handlePostDeleted = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const updateFilter = (nextFilter: 'explore' | 'recent' | 'following') => {
    setLoading(true);
    setFeedError(null);
    setFilter(nextFilter);
  };

  const updatePostType = (nextPostType?: PostType) => {
    setLoading(true);
    setFeedError(null);
    setPostType(nextPostType);
  };

  const updateTopic = (topic: string | null) => {
    setLoading(true);
    setFeedError(null);
    setSelectedTopic(topic);
  };

  const retryFeed = () => {
    setLoading(true);
    setFeedError(null);
    setFeedAttempt((attempt) => attempt + 1);
  };

  const topics = [...new Set([...(currentUser?.interests ?? []), ...(currentUser?.subjects ?? [])])]
    .filter(Boolean)
    .slice(0, 6);
  const suggestedTopics = ['Mathematics', 'Science', 'Philosophy', 'Art & culture', 'Technology'];

  return (
    <div className="flex gap-8">
      <div className="flex-1 min-w-0">
        <section className="relative mb-5 overflow-hidden rounded-[1.75rem] border border-[var(--curio-coral)]/15 bg-gradient-to-br from-[var(--curio-coral)]/[0.12] via-[#e7b378]/[0.12] to-[var(--curio-violet)]/[0.1] p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-[var(--curio-violet)]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-[var(--curio-yellow)]/20 blur-3xl" />
          <svg aria-hidden="true" viewBox="0 0 160 160" className="pointer-events-none absolute -right-4 top-1/2 hidden h-36 w-36 -translate-y-1/2 text-[var(--curio-coral)]/20 sm:block lg:right-8 lg:h-44 lg:w-44">
            <circle cx="80" cy="80" r="52" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 6" />
            <ellipse cx="80" cy="80" rx="68" ry="25" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(-35 80 80)" />
            <path d="m80 47 8 22 22 8-22 8-8 22-8-22-22-8 22-8 8-22Z" fill="currentColor" />
            <circle cx="132" cy="37" r="5" fill="var(--curio-yellow)" />
            <circle cx="32" cy="112" r="4" fill="var(--curio-mint)" />
          </svg>
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--curio-coral)]/15 bg-[var(--bg-card)]/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--curio-coral)] shadow-sm">
              <Sparkles size={13} />
              GOOD QUESTIONS TAKE YOU PLACES
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[var(--text-main)] sm:text-3xl">
                  Find your next <span className="text-[var(--curio-coral)]">“wait, what?”</span>
                </h1>
                <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--text-muted)] sm:text-sm">
                  Thoughtful discoveries, delightfully odd questions, and ideas worth passing around.
                </p>
              </div>
              <Link
                href="/communities"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)]/85 px-3.5 py-2 text-xs font-bold text-[var(--text-main)] transition hover:-translate-y-0.5 hover:border-[var(--curio-coral)]/50 hover:text-[var(--curio-coral)]"
              >
                <Compass size={14} />
                Find your people
                <ArrowRight size={13} />
              </Link>
          </div>
          </div>
        </section>

        <section aria-label="Explore topics" className="mb-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-xs font-bold text-[var(--text-main)]">
              {topics.length ? 'Little corners you might love' : 'Pick a curious direction'}
            </h2>
            {selectedTopic && (
              <button
                type="button"
                onClick={() => updateTopic(null)}
                className="text-[11px] font-semibold text-violet-700 hover:underline dark:text-violet-300"
              >
                Clear topic
              </button>
            )}
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {(topics.length ? topics : suggestedTopics).map((topic, index) => {
              const active = selectedTopic === topic;
              const hues = ['violet', 'pink', 'amber', 'sky', 'emerald', 'indigo'];
              const hue = hues[index % hues.length];
              const colorClasses: Record<string, string> = {
                violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
                pink: 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
                amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
                sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
                emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                indigo: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
              };
              return (
                <button
                  key={topic}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateTopic(active ? null : topic)}
                  className={`group inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                    active
                      ? 'border-violet-500 bg-violet-600 text-white shadow-md shadow-violet-600/20'
                      : `border-transparent ${colorClasses[hue]} hover:border-current/20`
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/60 text-[10px] dark:bg-black/15">
                    {index === 0 ? '✦' : index === 1 ? '◌' : index === 2 ? '↗' : '✧'}
                  </span>
                  {topic}
                </button>
              );
            })}
          </div>
          {!topics.length && (
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">
              Your profile interests will shape your For you mix.{' '}
              {currentUser ? (
                <Link href={`/profile/${currentUser.username}`} className="font-semibold text-violet-700 hover:underline dark:text-violet-300">
                  Add interests
                </Link>
              ) : (
                <span>Set interests on your profile to personalize it.</span>
              )}
            </p>
          )}
          {profileError && (
            <p role="status" className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Your profile interests could not be loaded; showing a general discovery mix.
            </p>
          )}
        </section>

        <FeedFilters
          filter={filter}
          onFilterChange={updateFilter}
          selectedPostType={postType}
          onPostTypeChange={updatePostType}
        />

        {feedError ? (
          <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center">
            <p className="text-sm font-bold text-[var(--text-main)]">Your feed couldn’t load just now.</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{feedError}</p>
            <button
              type="button"
              onClick={retryFeed}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-700"
            >
              <RefreshCw size={13} />
              Try again
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4 py-8">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 animate-pulse space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)]" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-24 h-3 bg-[var(--bg-elevated)] rounded-sm" />
                    <div className="w-32 h-2.5 bg-[var(--bg-elevated)] rounded-sm" />
                  </div>
                </div>
                <div className="w-3/4 h-4 bg-[var(--bg-elevated)] rounded-sm" />
                <div className="w-full h-16 bg-[var(--bg-elevated)] rounded-sm" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-12 text-center space-y-3">
            <Sparkles size={36} className="mx-auto text-violet-500" />
            <h3 className="text-base font-bold text-[var(--text-main)]">Nothing in this corner yet</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {selectedTopic
                ? `No posts match “${selectedTopic}” yet. Try another topic or clear this filter.`
                : filter === 'following'
                ? "You haven't followed any authors with posts yet. Switch to For you to discover thinkers!"
                : 'Try adjusting your post type filter or share the first inquiry in this category.'}
            </p>
            {selectedTopic && (
              <button
                type="button"
                onClick={() => updateTopic(null)}
                className="text-xs font-bold text-violet-700 hover:underline dark:text-violet-300"
              >
                Show all ideas
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onPostDeleted={handlePostDeleted}
              />
            ))}
          </div>
        )}
      </div>

      <CuriosityRail />
    </div>
  );
}
