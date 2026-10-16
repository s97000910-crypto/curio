'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Comment, Profile } from '@/lib/db/types';
import { MathRenderer } from '../ui/MathRenderer';
import { CheckCircle2, CornerDownRight, Trash2, Send } from 'lucide-react';

interface CommentSectionProps {
  postId: string;
  postAuthorId: string;
  comments: Comment[];
  currentUser: Profile | null;
  onCommentsUpdated: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  postAuthorId,
  comments,
  currentUser,
  onCommentsUpdated,
}) => {
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (parentId?: string) => {
    const text = parentId ? replyText : newCommentText;
    if (!text.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text.trim(),
          parentId,
        }),
      });

      if (res.ok) {
        if (parentId) {
          setReplyText('');
          setReplyingToId(null);
        } else {
          setNewCommentText('');
        }
        onCommentsUpdated();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleHelpful = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/helpful`, { method: 'POST' });
      if (res.ok) {
        onCommentsUpdated();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const canMarkHelpful =
    currentUser && (currentUser.id === postAuthorId || currentUser.role === 'moderator' || currentUser.role === 'admin');

  const renderComment = (c: Comment, isNested = false) => {
    const isAuthor = c.author_id === postAuthorId;
    const isStaff = c.author_role === 'moderator' || c.author_role === 'admin';

    return (
      <div
        key={c.id}
        className={`relative ${
          isNested ? 'ml-6 sm:ml-8 mt-2.5 pl-3 border-l-2 border-violet-500/20' : 'mt-4 pt-3 border-t border-[var(--border-subtle)]'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${c.author_username}`} className="shrink-0">
              <img
                src={c.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt=""
                className="w-6 h-6 rounded-full object-cover ring-1 ring-[var(--border-subtle)]"
              />
            </Link>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/profile/${c.author_username}`}
                className="text-xs font-bold hover:text-violet-600 transition"
              >
                {c.author_name}
              </Link>
              <span className="text-3xs text-[var(--text-muted)]">@{c.author_username}</span>
              {isAuthor && (
                <span className="px-1.5 py-0.2 rounded-md text-3xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  Author
                </span>
              )}
              {isStaff && (
                <span className="px-1.5 py-0.2 rounded-md text-3xs font-semibold bg-violet-500/10 text-violet-600 border border-violet-500/20">
                  {c.author_role}
                </span>
              )}
            </div>
          </div>

          {/* Helpful Badge or Toggle */}
          {c.is_helpful ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={12} />
              <span>Helpful Answer</span>
            </span>
          ) : canMarkHelpful ? (
            <button
              onClick={() => handleToggleHelpful(c.id)}
              className="text-3xs text-[var(--text-muted)] hover:text-emerald-600 transition"
              title="Mark as helpful explanation"
            >
              Mark Helpful
            </button>
          ) : null}
        </div>

        {/* Comment Body with MathRenderer */}
        <div className="text-xs text-[var(--text-main)] mt-1.5 pl-8">
          <MathRenderer content={c.content} />
        </div>

        {/* Reply Action */}
        <div className="flex items-center gap-3 pl-8 mt-1.5">
          <button
            onClick={() => setReplyingToId(replyingToId === c.id ? null : c.id)}
            className="flex items-center gap-1 text-3xs text-[var(--text-muted)] hover:text-violet-600 font-semibold transition"
          >
            <CornerDownRight size={12} />
            <span>Reply</span>
          </button>
        </div>

        {/* Inline Reply Form */}
        {replyingToId === c.id && (
          <div className="ml-8 mt-2 flex gap-2">
            <input
              type="text"
              placeholder={`Replying to @${c.author_username}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs focus:border-violet-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit(c.id);
              }}
            />
            <button
              onClick={() => handleSubmit(c.id)}
              disabled={submitting}
              className="px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition"
            >
              <Send size={12} />
            </button>
          </div>
        )}

        {/* Nested replies */}
        {c.replies && c.replies.map((reply) => renderComment(reply, true))}
      </div>
    );
  };

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
      {/* New Root Comment Box */}
      <div className="flex gap-2.5 mb-4">
        {currentUser && (
          <img
            src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt=""
            className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
          />
        )}
        <div className="flex-1 flex gap-2">
          <textarea
            rows={2}
            placeholder="Add to the inquiry... (Supports KaTeX formulas $...$)"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs focus:border-violet-500 focus:ring-1 focus:ring-violet-500 font-sans"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={submitting || !newCommentText.trim()}
            className="self-end px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition disabled:opacity-40"
          >
            Reply
          </button>
        </div>
      </div>

      {/* Comment List */}
      <div className="space-y-1">
        {comments.length === 0 ? (
          <p className="text-center py-4 text-xs text-[var(--text-muted)] italic">
            No comments yet. Be the first to share an explanation or question!
          </p>
        ) : (
          comments.map((c) => renderComment(c, false))
        )}
      </div>
    </div>
  );
};
