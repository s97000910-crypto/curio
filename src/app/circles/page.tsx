'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  CircleDot,
  Compass,
  LockKeyhole,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Circle } from '@/lib/db/types';

const subjects = ['All', 'Mathematics', 'Physics', 'Computer Science', 'Philosophy'];

export default function CirclesPage() {
  const router = useRouter();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [subject, setSubject] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyCircle, setBusyCircle] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const loadCircles = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (subject !== 'All') params.set('subject', subject);
    if (search.trim()) params.set('search', search.trim());
    try {
      const response = await fetch(`/api/circles?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load study circles.');
      setCircles(data.circles || []);
    } catch (loadFailure) {
      setError(loadFailure instanceof Error ? loadFailure.message : 'Could not load study circles.');
    } finally {
      setLoading(false);
    }
  }, [subject, search]);

  useEffect(() => {
    void Promise.resolve().then(loadCircles);
  }, [loadCircles]);

  const setCircleName = (value: string) => {
    setName(value);
    setSlug(value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const toggleJoin = async (circle: Circle) => {
    if (busyCircle) return;
    setBusyCircle(circle.id);
    setNotice('');
    try {
      const response = await fetch(`/api/circles/${encodeURIComponent(circle.id)}/join`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update membership.');
      setCircles((current) => current.map((item) => item.id === circle.id
        ? { ...item, is_member: data.joined, member_count: Math.max(0, (item.member_count || 0) + (data.joined ? 1 : -1)) }
        : item));
      setNotice(data.joined ? `You joined ${circle.name}.` : `You left ${circle.name}.`);
    } catch (joinError) {
      setNotice(joinError instanceof Error ? joinError.message : 'Could not update membership.');
    } finally {
      setBusyCircle('');
    }
  };

  const createCircle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setCreateError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description: form.get('description'),
          subject: form.get('subject'),
          is_private: form.get('is_private') === 'on',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create this circle.');
      router.push(`/circles/${data.circle.slug}`);
    } catch (createFailure) {
      setCreateError(createFailure instanceof Error ? createFailure.message : 'Could not create this circle.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-sky-500/10 p-6 sm:p-8">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">
              <Compass size={14} /> Think better together
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-main)] sm:text-4xl">Study circles</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">
              Find your people, set a shared learning rhythm, and make steady progress on the questions that matter to you.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setCreateError(''); setShowCreate(true); }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700"
          >
            <Plus size={17} /> Create a circle
          </button>
        </div>
        <div className="relative mt-7 flex items-center gap-3 border-t border-[var(--border-subtle)]/70 pt-5 text-xs text-[var(--text-muted)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-card)] text-violet-600"><Users size={17} /></div>
          <p><strong className="text-[var(--text-main)]">{circles.length}</strong> spaces for shared curiosity in this view</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {subjects.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSubject(item)}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  subject === item
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="relative sm:min-w-72">
            <span className="sr-only">Search study circles</span>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search circles and topics..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-main)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-violet-500/60"
            />
          </label>
        </div>
        {notice && <div role="status" className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-[var(--text-main)]">{notice}</div>}
        {error && <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">{error}</div>}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]" />)}
          </div>
        ) : circles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] px-6 py-14 text-center">
            <CircleDot className="mx-auto mb-3 text-[var(--text-muted)]" size={27} />
            <h2 className="font-bold text-[var(--text-main)]">No circles found</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Try another search or start a new study circle.</p>
            <button type="button" onClick={() => setShowCreate(true)} className="mt-4 text-sm font-bold text-violet-600 hover:underline">Create a circle</button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {circles.map((circle) => (
              <article key={circle.id} className="group flex flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-950/5 sm:p-6">
                <div>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">{circle.subject}</span>
                    <div className="flex items-center gap-2">
                      {circle.is_private && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300"><LockKeyhole size={11} /> Private</span>}
                      {circle.is_member && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300"><Check size={11} /> Joined</span>}
                    </div>
                  </div>
                  <Link href={`/circles/${circle.slug}`} className="text-xl font-bold leading-snug text-[var(--text-main)] transition group-hover:text-violet-700 dark:group-hover:text-violet-300">
                    {circle.name}
                  </Link>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--text-muted)]">{circle.description}</p>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1.5"><Users size={14} /> {circle.member_count || 0} {circle.member_count === 1 ? 'member' : 'members'}</span>
                    {circle.creator_name && <span>Started by {circle.creator_name}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {!circle.is_private && (
                      <button
                        type="button"
                        disabled={busyCircle === circle.id}
                        onClick={() => void toggleJoin(circle)}
                        className={`rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-60 ${circle.is_member ? 'border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]' : 'bg-violet-600 text-white hover:bg-violet-700'}`}
                      >
                        {busyCircle === circle.id ? 'Saving…' : circle.is_member ? 'Leave' : 'Join circle'}
                      </button>
                    )}
                    <Link href={`/circles/${circle.slug}`} aria-label={`Open ${circle.name}`} className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 dark:text-violet-300">
                      Open <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowCreate(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="create-circle-title" className="my-auto w-full max-w-xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-2xl sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 id="create-circle-title" className="text-xl font-black text-[var(--text-main)]">Start a study circle</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Set the purpose and invite curious minds to learn alongside you.</p>
              </div>
              <button type="button" aria-label="Close form" onClick={() => setShowCreate(false)} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"><X size={18} /></button>
            </div>
            <form onSubmit={createCircle} className="space-y-4">
              <label className="block text-xs font-semibold text-[var(--text-muted)]">
                Circle name
                <input value={name} onChange={(event) => setCircleName(event.target.value)} required maxLength={80} placeholder="e.g. A friendly path through calculus" className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] focus:border-violet-500/60" />
              </label>
              <label className="block text-xs font-semibold text-[var(--text-muted)]">
                Circle URL
                <div className="mt-1.5 flex overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                  <span className="shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-xs text-[var(--text-muted)]">/circles/</span>
                  <input value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} required className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[var(--text-main)] outline-none" />
                </div>
              </label>
              <label className="block text-xs font-semibold text-[var(--text-muted)]">
                What will you study together?
                <textarea name="description" required rows={3} maxLength={500} placeholder="Describe the topic, approach, and who might enjoy joining." className="mt-1.5 w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] focus:border-violet-500/60" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-[var(--text-muted)]">
                  Subject
                  <select name="subject" defaultValue="Mathematics" className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-main)]">
                    {subjects.slice(1).map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-3 self-end rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 text-sm text-[var(--text-main)]">
                  <input name="is_private" type="checkbox" className="h-4 w-4 accent-violet-600" />
                  <span><strong className="block text-xs">Private circle</strong><span className="text-[11px] text-[var(--text-muted)]">Only you and invited members</span></span>
                </label>
              </div>
              {createError && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{createError}</p>}
              <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-subtle)] pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">Cancel</button>
                <button type="submit" disabled={creating || !name.trim() || !slug.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60">
                  <Sparkles size={15} /> {creating ? 'Creating…' : 'Create circle'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
