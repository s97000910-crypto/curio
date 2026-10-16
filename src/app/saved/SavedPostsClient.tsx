'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Compass, RefreshCw } from 'lucide-react';
import { PostCard } from '@/components/feed/PostCard';
import { PostCardSkeleton } from '@/components/feed/PostCardSkeleton';
import type { Post, Profile } from '@/lib/db/types';

type SavedResponse = { posts?: Post[]; hasMore?: boolean; error?: string };

async function requestSaved(offset: number, signal?: AbortSignal): Promise<{ posts: Post[]; hasMore: boolean }> {
  let response: Response;
  try {
    response = await fetch(`/api/saved?offset=${offset}`, { signal });
  } catch (networkError) {
    if (signal?.aborted) throw networkError;
    throw new Error('Curio couldn’t be reached. Check your connection and try again.');
  }
  const data: SavedResponse = await response.json();
  if (!response.ok) {
    throw new Error(response.status < 500 ? data.error || 'Could not load your saved posts.' : 'Please try again in a moment.');
  }
  if (!Array.isArray(data.posts)) throw new Error('The saved posts response was incomplete.');
  return { posts: data.posts, hasMore: Boolean(data.hasMore) };
}

export default function SavedPostsClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  // Posts the person un-saved on this page. They stay visible so a slip can be undone.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (response.ok) setCurrentUser(data.currentUser);
      })
      .catch(() => {
        // The list works without the profile; it only affects delete controls.
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    requestSaved(0, controller.signal)
      .then((result) => {
        setPosts(result.posts);
        setHasMore(result.hasMore);
        setRemovedIds(new Set());
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        console.error('Failed to load saved posts:', requestError);
        setError(requestError instanceof Error ? requestError.message : 'Could not load your saved posts.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setAttempt((value) => value + 1);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    setMoreError(false);
    try {
      // Only posts that are still saved occupy a place in the server's list.
      const offset = posts.filter((post) => !removedIds.has(post.id)).length;
      const result = await requestSaved(offset);
      setPosts((current) => {
        const known = new Set(current.map((post) => post.id));
        return [...current, ...result.posts.filter((post) => !known.has(post.id))];
      });
      setHasMore(result.hasMore);
    } catch (requestError) {
      console.error('Failed to load more saved posts:', requestError);
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSavedChange = (id: string, saved: boolean) => {
    setRemovedIds((current) => {
      const next = new Set(current);
      if (saved) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePostDeleted = (id: string) => {
    setPosts((current) => current.filter((post) => post.id !== id));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <h1 className="text-2xl font-black tracking-tight text-[var(--text-main)] sm:text-3xl">Saved</h1>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)] sm:text-sm">
          Posts you’ve kept for later. Only you can see this list.
        </p>
      </header>

      {removedIds.size > 0 && (
        <p role="status" className="mb-4 text-xs text-[var(--text-muted)]">
          Posts you remove stay here until you leave this page. Save one again to keep it.
        </p>
      )}

      {error ? (
        <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center">
          <p className="text-sm font-bold text-[var(--text-main)]">Your saved posts couldn’t load.</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--curio-coral)] px-4 py-2 text-xs font-bold text-white transition hover:brightness-95"
          >
            <RefreshCw size={13} />
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-4" role="status" aria-label="Loading your saved posts">
          {[1, 2, 3].map((n) => (
            <PostCardSkeleton key={n} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center">
          <Bookmark size={32} className="mx-auto text-[var(--curio-coral)]" aria-hidden="true" />
          <h2 className="mt-3 text-base font-bold text-[var(--text-main)]">Nothing saved yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[var(--text-muted)]">
            Tap the bookmark on any post to keep it here, so you can come back when you have time to read it properly.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3.5 py-2 text-xs font-bold text-[var(--text-main)] transition hover:border-[var(--curio-coral)]/50 hover:text-[var(--curio-coral)]"
          >
            <Compass size={14} />
            Find something to read
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onPostDeleted={handlePostDeleted}
                onSavedChange={handleSavedChange}
              />
            ))}
          </div>

          {(hasMore || moreError) && (
            <div className="mt-5 text-center">
              {moreError && (
                <p role="alert" className="mb-2 text-xs text-rose-600 dark:text-rose-400">
                  Couldn’t load more saved posts.
                </p>
              )}
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2 text-xs font-bold text-[var(--text-main)] transition hover:border-[var(--curio-coral)]/50 disabled:opacity-60"
              >
                {loadingMore ? 'Loading…' : moreError ? 'Try again' : 'Show more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
