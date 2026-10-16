'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDot,
  LockKeyhole,
  MessageCircle,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { Circle, CircleDiscussion, CircleMilestone } from '@/lib/db/types';

export default function CircleDetailClient({ slug }: { slug: string }) {
  const [circle, setCircle] = useState<Circle | null>(null);
  const [milestones, setMilestones] = useState<CircleMilestone[]>([]);
  const [discussions, setDiscussions] = useState<CircleDiscussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [milestoneError, setMilestoneError] = useState('');
  const [discussionError, setDiscussionError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDiscussions = useCallback(async (circleId: string) => {
    const response = await fetch(`/api/circles/${encodeURIComponent(circleId)}/discussions`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load discussions.');
    setDiscussions(data.discussions || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/circles');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load study circle.');
        const found = (data.circles as Circle[] | undefined)?.find((item) => item.slug === slug) || null;
        if (!found) throw new Error('This circle is not available. It may be private, archived, or no longer exist.');
        const [milestoneResponse, discussionResponse] = await Promise.all([
          fetch(`/api/circles/${encodeURIComponent(found.id)}/milestones`),
          fetch(`/api/circles/${encodeURIComponent(found.id)}/discussions`),
        ]);
        const [milestoneData, discussionData] = await Promise.all([milestoneResponse.json(), discussionResponse.json()]);
        if (!milestoneResponse.ok) throw new Error(milestoneData.error || 'Could not load the circle milestones.');
        if (!cancelled) {
          setCircle(found);
          setMilestones(milestoneData.milestones || []);
          if (discussionResponse.ok) {
            setDiscussions(discussionData.discussions || []);
            setDiscussionError('');
          } else {
            setDiscussions([]);
            setDiscussionError(discussionData.error || 'Discussions are available to circle members.');
          }
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Could not load study circle.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [slug]);

  const toggleMembership = async () => {
    if (!circle || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(`/api/circles/${encodeURIComponent(circle.id)}/join`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update membership.');
      setCircle((current) => current ? {
        ...current,
        is_member: data.joined,
        member_count: Math.max(0, (current.member_count || 0) + (data.joined ? 1 : -1)),
      } : current);
      if (data.joined) {
        setNotice(`You joined ${circle.name}. You can now join the discussion.`);
        setDiscussionError('');
        await loadDiscussions(circle.id);
      } else {
        setDiscussions([]);
        setDiscussionError('Join this circle to read and post discussions.');
        setNotice(`You left ${circle.name}.`);
      }
    } catch (joinError) {
      setNotice(joinError instanceof Error ? joinError.message : 'Could not update membership.');
    } finally {
      setBusy(false);
    }
  };

  const submitMilestone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!circle) return;
    setBusy(true);
    setMilestoneError('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(`/api/circles/${encodeURIComponent(circle.id)}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.get('title'),
          description: form.get('description'),
          target_date: form.get('target_date') || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not add milestone.');
      setMilestones((current) => [...current, data.milestone].sort((a, b) =>
        (a.target_date || '9999').localeCompare(b.target_date || '9999')));
      formElement.reset();
    } catch (submitError) {
      setMilestoneError(submitError instanceof Error ? submitError.message : 'Could not add milestone.');
    } finally {
      setBusy(false);
    }
  };

  const toggleMilestone = async (milestone: CircleMilestone) => {
    if (!circle || busy) return;
    setBusy(true);
    setMilestoneError('');
    try {
      const response = await fetch(`/api/circles/${encodeURIComponent(circle.id)}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', milestoneId: milestone.id, isCompleted: !milestone.is_completed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update milestone.');
      setMilestones((current) => current.map((item) => item.id === milestone.id ? { ...item, is_completed: !item.is_completed } : item));
    } catch (toggleError) {
      setMilestoneError(toggleError instanceof Error ? toggleError.message : 'Could not update milestone.');
    } finally {
      setBusy(false);
    }
  };

  const submitDiscussion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!circle) return;
    setBusy(true);
    setDiscussionError('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(`/api/circles/${encodeURIComponent(circle.id)}/discussions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.get('title'), content: form.get('content') }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not post to the discussion.');
      setDiscussions((current) => [...current, data.discussion]);
      formElement.reset();
    } catch (submitError) {
      setDiscussionError(submitError instanceof Error ? submitError.message : 'Could not post to the discussion.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-5xl animate-pulse py-14 text-center text-sm text-[var(--text-muted)]">Finding your study circle…</div>;
  }

  if (!circle) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600"><CircleDot size={25} /></div>
        <h1 className="text-2xl font-black text-[var(--text-main)]">Circle not found</h1>
        <p role="alert" className="text-sm text-[var(--text-muted)]">{error || 'This study circle is not available.'}</p>
        <Link href="/circles" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">
          <ArrowLeft size={15} /> Browse study circles
        </Link>
      </main>
    );
  }

  const completedCount = milestones.filter((item) => item.is_completed).length;
  const isOrganizer = circle.role === 'organizer';

  return (
    <main className="mx-auto max-w-6xl space-y-5">
      <Link href="/circles" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-main)]">
        <ArrowLeft size={15} /> All study circles
      </Link>
      {notice && <div role="status" className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-[var(--text-main)]">{notice}</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">{error}</div>}

      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-sky-500/10 p-6 sm:p-8">
        <div className="absolute -right-10 -top-14 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">{circle.subject}</span>
            {circle.is_private && <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300"><LockKeyhole size={11} /> Private</span>}
            {isOrganizer && <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Organizer</span>}
          </div>
          <div className="mt-4 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-black tracking-tight text-[var(--text-main)] sm:text-4xl">{circle.name}</h1>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{circle.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1.5"><Users size={14} />{circle.member_count || 0} members</span>
                {circle.creator_name && <span>Organized by {circle.creator_name}</span>}
              </div>
            </div>
            {!circle.is_member && !circle.is_private ? (
              <button type="button" disabled={busy} onClick={() => void toggleMembership()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 disabled:opacity-60">
                <Users size={16} /> {busy ? 'Joining…' : 'Join this circle'}
              </button>
            ) : circle.is_member && !isOrganizer ? (
              <button type="button" disabled={busy} onClick={() => void toggleMembership()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] disabled:opacity-60">
                {busy ? 'Saving…' : 'Leave circle'}
              </button>
            ) : circle.is_private && !circle.is_member ? (
              <span className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-300"><LockKeyhole size={15} /> Invite required</span>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <h2 className="text-lg font-bold text-[var(--text-main)]">Shared milestones</h2>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {milestones.length ? `${completedCount} of ${milestones.length} completed` : 'Plan a few checkpoints for your shared learning path.'}
              </p>
            </div>
            {milestones.length > 0 && (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">{Math.round((completedCount / milestones.length) * 100)}%</span>
            )}
          </div>
          {milestones.length > 0 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(completedCount / milestones.length) * 100}%` }} />
            </div>
          )}
          {milestoneError && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-600">{milestoneError}</p>}
          {milestones.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border-subtle)] px-4 py-8 text-center">
              <Sparkles className="mx-auto mb-2 text-[var(--text-muted)]" size={21} />
              <p className="text-sm text-[var(--text-muted)]">{isOrganizer ? 'Add the first milestone below to get your circle moving.' : 'The organizer has not added milestones yet.'}</p>
            </div>
          ) : (
            <ol className="space-y-2">
              {milestones.map((milestone) => (
                <li key={milestone.id} className={`flex gap-3 rounded-xl border p-3 transition ${milestone.is_completed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'}`}>
                  <button type="button" aria-label={`${milestone.is_completed ? 'Reopen' : 'Complete'} ${milestone.title}`} disabled={!isOrganizer || busy} onClick={() => void toggleMilestone(milestone)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition disabled:cursor-default ${milestone.is_completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-[var(--border-subtle)] text-transparent'} ${isOrganizer && !milestone.is_completed ? 'hover:border-emerald-500' : ''}`}>
                    <Check size={12} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className={`text-sm font-semibold ${milestone.is_completed ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-main)]'}`}>{milestone.title}</h3>
                    {milestone.description && <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{milestone.description}</p>}
                    {milestone.target_date && <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]"><CalendarDays size={12} />{formatDate(milestone.target_date)}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
          {isOrganizer && (
            <form onSubmit={submitMilestone} className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Add a milestone</h3>
              <input name="title" required maxLength={100} placeholder="e.g. Finish the first three chapters" className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] focus:border-violet-500/60" />
              <textarea name="description" rows={2} placeholder="Optional details" className="w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] focus:border-violet-500/60" />
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="flex flex-1 items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-muted)]">
                  <CalendarDays size={14} />
                  <span className="sr-only">Target date</span>
                  <input name="target_date" type="date" className="min-w-0 flex-1 bg-transparent text-[var(--text-main)] outline-none" />
                </label>
                <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-60">
                  <Check size={14} /> {busy ? 'Saving…' : 'Add milestone'}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-violet-600" />
                <h2 className="text-lg font-bold text-[var(--text-main)]">Circle discussion</h2>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Ask questions, share discoveries, and compare notes.</p>
            </div>
            <span className="rounded-full bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]">{discussions.length}</span>
          </div>

          {discussionError && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-200">
              <p>{discussionError}</p>
              {!circle.is_member && !circle.is_private && (
                <button type="button" disabled={busy} onClick={() => void toggleMembership()} className="mt-2 text-xs font-bold underline underline-offset-2">
                  Join the circle to participate
                </button>
              )}
            </div>
          )}
          {discussions.length === 0 && !discussionError ? (
            <div className="rounded-xl border border-dashed border-[var(--border-subtle)] px-4 py-8 text-center">
              <MessageCircle className="mx-auto mb-2 text-[var(--text-muted)]" size={21} />
              <p className="text-sm text-[var(--text-muted)]">No discussions yet. Kick off the conversation.</p>
            </div>
          ) : (
            <ol className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
              {discussions.map((discussion) => (
                <li key={discussion.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-[var(--text-main)]">{discussion.title}</h3>
                    <span className="shrink-0 text-[10px] text-[var(--text-muted)]">{formatDate(discussion.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-muted)]">{discussion.content}</p>
                  <p className="mt-3 text-[11px] font-semibold text-violet-700 dark:text-violet-300">{discussion.author_name || 'Circle member'}</p>
                </li>
              ))}
            </ol>
          )}

          {circle.is_member && (
            <form onSubmit={submitDiscussion} className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Start a discussion</h3>
              <input name="title" required maxLength={120} placeholder="A clear, curious title" className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] focus:border-violet-500/60" />
              <textarea name="content" required rows={4} maxLength={5000} placeholder="Share your question, idea, or progress…" className="w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] focus:border-violet-500/60" />
              <div className="flex justify-end">
                <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-60">
                  <Send size={14} /> {busy ? 'Posting…' : 'Post discussion'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
