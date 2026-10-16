'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Bookmark,
  Share2,
  MoreHorizontal,
  Pin,
  CheckCircle2,
  Trash2,
  ShieldAlert,
  Sparkles,
  Heart,
} from 'lucide-react';
import { Comment, Post, Profile, ReactionType } from '@/lib/db/types';
import { MathRenderer } from '../ui/MathRenderer';
import { StickerBadge } from '../ui/StickerPicker';
import { ReportModal } from '../ui/ReportModal';
import { CommentSection } from './CommentSection';

interface PostCardProps {
  post: Post;
  currentUser: Profile | null;
  onPostDeleted?: (id: string) => void;
  /** Called after a save or un-save succeeds on the server. */
  onSavedChange?: (id: string, saved: boolean) => void;
}

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'eureka', emoji: '⚡', label: 'Eureka' },
  { type: 'insightful', emoji: '💡', label: 'Insight' },
  { type: 'heart', emoji: '❤️', label: 'Appreciate' },
  { type: 'curious', emoji: '🤔', label: 'Curious' },
  { type: 'celebrate', emoji: '🎉', label: 'Celebrate' },
];

export const PostCard: React.FC<PostCardProps> = ({ post, currentUser, onPostDeleted, onSavedChange }) => {
  const [reactionCount, setReactionCount] = useState(post.reaction_count);
  const [userReactions, setUserReactions] = useState<string[]>(post.user_reactions || []);
  const [isBookmarked, setIsBookmarked] = useState(Boolean(post.is_bookmarked));
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [poll, setPoll] = useState(post.poll);
  const [voting, setVoting] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Reaction toggle
  const handleToggleReaction = async (type: ReactionType) => {
    try {
      const res = await fetch(`/api/posts/${post.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reactionType: type }),
      });
      const data = await res.json();
      if (res.ok) {
        setReactionCount(data.reaction_count);
        if (data.reacted) {
          setUserReactions([...userReactions, type]);
        } else {
          setUserReactions(userReactions.filter((r) => r !== type));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Bookmark toggle
  const handleToggleBookmark = async () => {
    if (savePending) return;
    setSavePending(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/posts/${post.id}/bookmark`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update your saved posts.');
      setIsBookmarked(data.bookmarked);
      setJustSaved(Boolean(data.bookmarked));
      setSaveNotice(data.bookmarked ? 'Saved. Find it in Saved.' : 'Removed from Saved.');
      onSavedChange?.(post.id, Boolean(data.bookmarked));
    } catch (e) {
      console.error(e);
      setSaveNotice('');
      setSaveError('Couldn’t update your saved posts. Check your connection and try again.');
    } finally {
      setSavePending(false);
    }
  };

  // Poll voting
  const handleVotePoll = async (optionId: string) => {
    if (!poll || voting) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId: poll.id, optionId }),
      });
      const data = await res.json();
      if (res.ok && data.poll) {
        setPoll(data.poll);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVoting(false);
    }
  };

  // Load comments
  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`);
      const data = await res.json();
      if (data.comments) {
        setComments(data.comments);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onPostDeleted) onPostDeleted(post.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const canDelete =
    currentUser && (currentUser.id === post.author_id || currentUser.role === 'moderator' || currentUser.role === 'admin');

  return (
    <>
      <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-[0_4px_18px_rgba(41,39,34,0.035)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--curio-coral)]/35 hover:shadow-lg hover:shadow-[var(--curio-coral)]/5 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <Link href={`/profile/${post.author_username}`} className="shrink-0">
              <img
                src={post.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt=""
                className="w-9 h-9 rounded-full object-cover ring-1 ring-[var(--border-subtle)] hover:scale-105 transition-transform"
              />
            </Link>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/profile/${post.author_username}`}
                  className="text-xs font-bold hover:text-violet-600 transition"
                >
                  {post.author_name}
                </Link>
                <span className="text-3xs text-[var(--text-muted)]">@{post.author_username}</span>
                {post.author_role !== 'user' && (
                  <span className="px-1.5 py-0.2 rounded-full text-3xs font-extrabold uppercase bg-violet-500 text-white">
                    {post.author_role}
                  </span>
                )}
                <span className="text-3xs text-[var(--text-muted)]">•</span>
                <span className="text-3xs text-[var(--text-muted)]">
                  {new Date(post.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {/* Community and flairs */}
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Link
                  href={`/c/${post.community_slug}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-bold transition hover:opacity-85"
                  style={{
                    backgroundColor: `${post.community_color || '#8B5CF6'}15`,
                    color: post.community_color || '#8B5CF6',
                  }}
                >
                  <span>c/{post.community_name}</span>
                </Link>

                {post.flair && (
                  <span className="px-2 py-0.5 rounded-full text-3xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                    {post.flair}
                  </span>
                )}

                {post.sticker_code && <StickerBadge code={post.sticker_code} />}

                {post.is_pinned && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-3xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Pin size={10} />
                    <span>Pinned</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Post Menu / Options */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition"
              aria-label="More options"
            >
              <MoreHorizontal size={18} />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-1.5 shadow-xl z-20 text-xs">
                <button
                  onClick={() => {
                    setShowReport(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition text-left"
                >
                  <ShieldAlert size={14} />
                  <span>Report Post</span>
                </button>
                {canDelete && (
                  <button
                    onClick={() => {
                      handleDeletePost();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition text-left"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Post Title */}
        <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)] mb-2 leading-snug">
          {post.title}
        </h2>

        {/* Content with KaTeX Math notation */}
        <div className="text-xs sm:text-sm text-[var(--text-main)] mb-3 leading-relaxed">
          <MathRenderer content={post.content} />
        </div>

        {/* Attached Diagram / Image */}
        {post.image_url && (
          <div className="my-3 rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-canvas)] max-h-96">
            <img
              src={post.image_url}
              alt=""
              className="w-full h-auto object-cover max-h-96 hover:scale-101 transition-transform"
            />
          </div>
        )}

        {post.video_asset_id && (
          <div className="my-3 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-black">
            <video
              src={`/api/videos/${post.video_asset_id}`}
              controls
              playsInline
              preload="metadata"
              aria-label={`Video attached to ${post.title}`}
              className="max-h-[min(70vh,42rem)] w-full object-contain"
            />
          </div>
        )}

        {/* Poll Widget */}
        {poll && (
          <div className="my-3.5 p-3.5 rounded-xl border border-violet-500/20 bg-violet-500/5 space-y-2">
            <div className="text-xs font-bold text-violet-700 dark:text-violet-300">
              📊 {poll.question}
            </div>
            <div className="space-y-1.5">
              {poll.options.map((opt) => {
                const isSelected = poll.user_voted_option_id === opt.id;
                const pct = poll.total_votes > 0 ? Math.round((opt.vote_count / poll.total_votes) * 100) : 0;
                return (
                  <button
                    key={opt.id}
                    disabled={voting || Boolean(poll.user_voted_option_id)}
                    onClick={() => handleVotePoll(opt.id)}
                    className={`relative w-full text-left p-2.5 rounded-lg border text-xs font-medium overflow-hidden transition-all ${
                      isSelected
                        ? 'border-violet-600 bg-violet-600/10 font-bold'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-violet-400'
                    }`}
                  >
                    {/* Fill bar */}
                    {poll.user_voted_option_id && (
                      <div
                        className="absolute inset-y-0 left-0 bg-violet-500/15 transition-all duration-500 pointer-events-none"
                        style={{ width: `${pct}%` }}
                      />
                    )}
                    <div className="relative flex items-center justify-between z-10">
                      <span>{opt.text}</span>
                      {poll.user_voted_option_id && (
                        <span className="text-2xs font-bold text-violet-600 dark:text-violet-400 shrink-0 ml-2">
                          {pct}% ({opt.vote_count})
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-3xs text-[var(--text-muted)] pt-1 flex items-center justify-between">
              <span>{poll.total_votes} total votes</span>
              {poll.user_voted_option_id && <span className="text-emerald-500 font-semibold">✓ You voted</span>}
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] mt-3">
          {/* Reaction Buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            {REACTIONS.map((r) => {
              const active = userReactions.includes(r.type);
              return (
                <button
                  key={r.type}
                  onClick={() => handleToggleReaction(r.type)}
                  title={r.label}
                  aria-label={r.type === 'heart' ? 'Like post' : r.label}
                  aria-pressed={active}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    r.type === 'heart'
                      ? active
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 scale-105'
                        : 'text-[var(--text-muted)] border border-transparent hover:bg-rose-500/5 hover:text-rose-500'
                      : active
                      ? 'bg-violet-600/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 scale-105'
                      : 'hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-transparent'
                  }`}
                >
                  {r.type === 'heart' ? (
                    <Heart size={14} fill={active ? 'currentColor' : 'none'} />
                  ) : (
                    <span>{r.emoji}</span>
                  )}
                  {r.type === 'heart' && <span>Like</span>}
                </button>
              );
            })}
            {reactionCount > 0 && (
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400 ml-1">
                {reactionCount}
              </span>
            )}
          </div>

          {/* Comments & Bookmark */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleComments}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                showComments
                  ? 'bg-violet-600/10 text-violet-600'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <MessageSquare size={14} />
              <span>{commentCount}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleBookmark}
              disabled={savePending}
              aria-pressed={isBookmarked}
              aria-label={isBookmarked ? 'Remove from saved' : 'Save for later'}
              title={isBookmarked ? 'Remove from saved' : 'Save for later'}
              className={`flex items-center gap-1.5 rounded-full p-2 text-xs font-semibold transition disabled:opacity-60 sm:px-2.5 sm:py-1.5 ${
                isBookmarked
                  ? 'text-amber-600 bg-amber-500/10 dark:text-amber-400'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Bookmark
                size={15}
                fill={isBookmarked ? 'currentColor' : 'none'}
                className={justSaved && isBookmarked ? 'curio-pop' : undefined}
              />
              <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>

        <span role="status" aria-live="polite" className="sr-only">
          {saveNotice}
        </span>
        {saveError && (
          <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
            {saveError}
          </p>
        )}

        {/* Threaded Comments Section */}
        {showComments && (
          <CommentSection
            postId={post.id}
            postAuthorId={post.author_id}
            comments={comments}
            currentUser={currentUser}
            onCommentsUpdated={() => {
              loadComments();
              setCommentCount((prev) => prev + 1);
            }}
          />
        )}
      </article>

      {/* Safety Report Modal */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetType="post"
        targetId={post.id}
        targetTitle={post.title}
      />
    </>
  );
};
