'use client';

import { useState } from 'react';
import { Ban, Check, UserPlus, UserRoundCheck } from 'lucide-react';

export default function ProfileActions({
  username,
  initialFollowing,
  initialBlocked,
}: {
  username: string;
  initialFollowing: boolean;
  initialBlocked: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function toggle(action: 'follow' | 'block') {
    setPending(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/${action}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Could not update ${action} status.`);
      if (action === 'follow') {
        setFollowing(Boolean(data.following));
        setNotice(data.following ? `You’re now following @${username}.` : `You unfollowed @${username}.`);
      } else {
        const nextBlocked = Boolean(data.blocked);
        setBlocked(nextBlocked);
        setConfirmBlock(false);
        if (nextBlocked) setFollowing(false);
        setNotice(nextBlocked ? `@${username} has been blocked.` : `@${username} has been unblocked.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The action could not be completed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void toggle('follow')}
          disabled={pending || blocked}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            following
              ? 'border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-main)] hover:border-violet-500/40'
              : 'bg-violet-600 text-white shadow-md shadow-violet-500/15 hover:bg-violet-700'
          }`}
        >
          {following ? <UserRoundCheck size={15} /> : <UserPlus size={15} />}
          {blocked ? 'Blocked' : following ? 'Following' : 'Follow'}
        </button>
        {blocked ? (
          <button
            type="button"
            onClick={() => void toggle('block')}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-400"
          >
            <Check size={14} />
            {pending ? 'Updating…' : 'Unblock'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError('');
              setConfirmBlock((value) => !value);
            }}
            disabled={pending}
            aria-expanded={confirmBlock}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-muted)] transition hover:border-rose-500/30 hover:text-rose-600 disabled:opacity-50 dark:hover:text-rose-400"
          >
            <Ban size={14} />
            Block
          </button>
        )}
      </div>
      {confirmBlock && !blocked && (
        <div className="w-full max-w-sm rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 sm:text-right">
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            Block @{username}? This removes any existing follow and keeps their posts out of your feed.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmBlock(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void toggle('block')}
              disabled={pending}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {pending ? 'Blocking…' : 'Confirm block'}
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-right text-xs text-rose-600">{error}</p>}
      {notice && <p role="status" className="text-right text-xs text-[var(--text-muted)]">{notice}</p>}
      {blocked && <p className="text-right text-[11px] text-[var(--text-muted)]">This account is blocked. Unblock to follow again.</p>}
    </div>
  );
}
