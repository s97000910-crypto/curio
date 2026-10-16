'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Check,
  Shield,
  Sparkles,
  Camera,
  Trash2,
  LoaderCircle,
} from 'lucide-react';
import { Community, Post, Profile } from '@/lib/db/types';
import { PostCard } from '@/components/feed/PostCard';
import { CreatePostModal } from '@/components/ui/CreatePostModal';
import { CommunityCover } from '@/components/communities/CommunityCover';
import { CommunityAvatar } from '@/components/communities/CommunityAvatar';

export default function CommunityDetailClient({ slug }: { slug: string }) {
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth')
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.currentUser))
      .catch(() => {});
  }, []);

  const loadData = useCallback(() => {
    if (!slug) return;
    setLoading(true);

    // Fetch community
    fetch(`/api/communities`)
      .then((r) => r.json())
      .then((data) => {
        const found = data.communities?.find((c: Community) => c.slug === slug);
        if (found) {
          setCommunity(found);
          // Fetch posts for this community
          return fetch(`/api/posts?communityId=${found.id}`)
            .then((r) => r.json())
            .then((pd) => {
              if (pd.posts) setPosts(pd.posts);
            });
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    queueMicrotask(loadData);
  }, [loadData]);

  const handleToggleJoin = async () => {
    if (!community) return;
    try {
      const res = await fetch(`/api/communities/${community.slug}/join`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setCommunity({ ...community, is_member: data.joined, member_count: data.member_count });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCommunityImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !community) return;

    setImageBusy(true);
    setImageError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`/api/communities/${community.slug}/image`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not upload the community picture');
      setCommunity((current) => current ? { ...current, image_url: data.image_url } : current);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Could not upload the community picture');
    } finally {
      setImageBusy(false);
      event.target.value = '';
    }
  };

  const handleCommunityImageRemove = async () => {
    if (!community) return;
    setImageBusy(true);
    setImageError(null);
    try {
      const response = await fetch(`/api/communities/${community.slug}/image`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not remove the community picture');
      setCommunity((current) => current ? { ...current, image_url: data.image_url } : current);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Could not remove the community picture');
    } finally {
      setImageBusy(false);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return p.title.toLowerCase().includes(term) || p.content.toLowerCase().includes(term);
  });

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-[var(--text-muted)] animate-pulse">
        Loading community...
      </div>
    );
  }

  if (!community) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-lg font-bold">Community Not Found</h2>
        <Link href="/communities" className="text-xs text-violet-600 underline">
          Back to Communities
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Community Banner */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden shadow-xs">
        <CommunityCover community={community} className="h-36 sm:h-44" eager />

        <div className="p-6 -mt-10 relative flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex min-w-0 items-end gap-4">
            <div className="flex shrink-0 flex-col items-center">
              <div className="relative rounded-[1.65rem] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-300 p-[3px] shadow-lg shadow-violet-500/15">
                <CommunityAvatar
                  community={community}
                  className="h-20 w-20 rounded-[1.45rem] border-[3px] border-[var(--bg-card)] text-2xl font-black"
                />
              {community.can_manage_image && (
                <>
                  <input
                    id="community-picture-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handleCommunityImageChange}
                    disabled={imageBusy}
                    aria-label="Choose a community picture. PNG, JPG or WebP, up to 5 MB."
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('community-picture-upload')?.click()}
                    disabled={imageBusy}
                    title="Change community picture"
                    aria-label="Change community picture"
                    className="absolute -bottom-2 -right-3 inline-flex h-8 items-center gap-1.5 rounded-full border-2 border-[var(--bg-card)] bg-violet-600 px-2.5 text-[10px] font-bold text-white shadow-md shadow-violet-600/25 transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:opacity-70"
                  >
                    {imageBusy ? (
                      <LoaderCircle size={13} className="animate-spin" />
                    ) : (
                      <Camera size={13} />
                    )}
                    <span>{imageBusy ? 'Saving' : 'Edit'}</span>
                  </button>
                </>
              )}
              </div>
              {community.can_manage_image && community.image_url && (
                <button
                  type="button"
                  onClick={handleCommunityImageRemove}
                  disabled={imageBusy}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-muted)] transition hover:text-rose-600 disabled:opacity-60"
                >
                  <Trash2 size={11} />
                  Remove photo
                </button>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-2xl font-black text-[var(--text-main)]">{community.name}</h1>
                <span className="text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                  {community.category}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{community.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleToggleJoin}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                community.is_member
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-500/20'
              }`}
            >
              {community.is_member ? (
                <>
                  <Check size={14} />
                  <span>Joined</span>
                </>
              ) : (
                <span>Join Community</span>
              )}
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-violet-500 transition"
            >
              <Plus size={14} />
              <span>Post Inquiry</span>
            </button>
          </div>
        </div>
      </div>
      {imageError && <p role="alert" className="text-xs text-rose-600">{imageError}</p>}

      {/* Main Grid: Feed + Rules Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts Stream */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-[var(--text-main)]">
              Discussions & Discoveries ({filteredPosts.length})
            </h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="search"
                placeholder="Search in this community..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] pl-8 pr-3 py-1 text-xs"
              />
            </div>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-2">
              <Sparkles size={32} className="mx-auto text-violet-500" />
              <p className="text-xs text-[var(--text-muted)]">No posts found in this community yet.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-xs text-violet-600 font-bold hover:underline"
              >
                Share the first post
              </button>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onPostDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
              />
            ))
          )}
        </div>

        {/* Community Rules & Info */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4.5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Shield size={14} className="text-violet-600" />
              <span>Community Norms & Rules</span>
            </h3>
            <div className="text-xs text-[var(--text-muted)] whitespace-pre-line leading-relaxed">
              {community.rules}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4.5 shadow-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Community Stats
            </h3>
            <div className="flex justify-between text-xs py-1 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-muted)]">Members</span>
              <span className="font-bold text-[var(--text-main)]">{community.member_count}</span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-[var(--text-muted)]">Total Inquiries</span>
              <span className="font-bold text-[var(--text-main)]">{community.post_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Post Modal pre-filled */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        defaultCommunityId={community.id}
        onSuccess={loadData}
      />
    </div>
  );
}
