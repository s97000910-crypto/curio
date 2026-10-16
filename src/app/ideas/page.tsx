'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  Lightbulb,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { Investigation, InvestigationStatus } from '@/lib/db/types';

const subjects = ['Mathematics', 'Science and technology', 'Humanities and arts'];
const statuses: { value: InvestigationStatus; label: string }[] = [
  { value: 'exploring', label: 'Exploring' },
  { value: 'seeking_collaborators', label: 'Seeking collaborators' },
  { value: 'under_discussion', label: 'Under discussion' },
  { value: 'needs_verification', label: 'Needs verification' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'archived', label: 'Archived' },
];

const statusStyle: Record<InvestigationStatus, string> = {
  exploring: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  seeking_collaborators: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  under_discussion: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  needs_verification: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  archived: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]',
};

function labelForStatus(status: InvestigationStatus) {
  return statuses.find((item) => item.value === status)?.label ?? status;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(date)
  );
}

export default function IdeasPage() {
  const router = useRouter();
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [subject, setSubject] = useState('All');
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (subject !== 'All') params.set('subject', subject);
    if (status !== 'All') params.set('status', status);
    if (submittedSearch.trim()) params.set('search', submittedSearch.trim());

    async function fetchInvestigations() {
      try {
        const response = await fetch(`/api/ideas?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load investigations.');
        if (active) {
          setInvestigations(data.investigations || []);
          setLoadError('');
        }
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Could not load investigations.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchInvestigations();
    return () => {
      active = false;
    };
  }, [subject, status, submittedSearch, reloadKey]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setLoadError('');
    if (submittedSearch === search) setReloadKey((value) => value + 1);
    else setSubmittedSearch(search);
  };

  const updateSubject = (value: string) => {
    setLoading(true);
    setLoadError('');
    if (subject === value) setReloadKey((current) => current + 1);
    else setSubject(value);
  };

  const updateStatus = (value: string) => {
    setLoading(true);
    setLoadError('');
    if (status === value) setReloadKey((current) => current + 1);
    else setStatus(value);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError('');
    setCreating(true);
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') || '').trim();
    const slug = title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const payload = {
      title,
      slug,
      subject: String(formData.get('subject') || ''),
      summary: String(formData.get('summary') || '').trim(),
      hypothesis: String(formData.get('hypothesis') || '').trim(),
      proposed_arguments: String(formData.get('proposed_arguments') || '').trim(),
      citations: String(formData.get('citations') || '').trim(),
      status: 'exploring' as InvestigationStatus,
    };

    try {
      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create this investigation.');
      setShowCreate(false);
      router.push(`/ideas/${data.investigation.slug}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not create this investigation.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">
              <Lightbulb size={13} />
              The idea lab
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-[var(--text-main)] sm:text-4xl">
              Good questions grow here.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">
              Explore open investigations, sharpen a hypothesis, and work with curious people to move an idea forward.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCreateError('');
              setShowCreate(true);
            }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700"
          >
            <Plus size={17} />
            Start an investigation
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['All', ...subjects].map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => updateSubject(item)}
                aria-pressed={subject === item}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  subject === item
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {item === 'All' ? 'All subjects' : item}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="idea-status">
              Filter by status
            </label>
            <select
              id="idea-status"
              value={status}
              onChange={(event) => updateStatus(event.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-main)]"
            >
              <option value="All">All statuses</option>
              {statuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <form onSubmit={handleSearch} className="relative flex min-w-0 sm:min-w-64">
              <Search
                size={15}
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search investigations"
                aria-label="Search investigations"
                className="min-w-0 flex-1 rounded-l-xl border border-r-0 border-[var(--border-subtle)] bg-[var(--bg-canvas)] py-2 pl-9 pr-3 text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
              />
              <button
                type="submit"
                className="rounded-r-xl border border-violet-600 bg-violet-600 px-3 text-xs font-bold text-white transition hover:bg-violet-700"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-main)]">Open investigations</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {loading ? 'Finding ideas…' : `${investigations.length} ${investigations.length === 1 ? 'idea' : 'ideas'} to explore`}
          </p>
        </div>
        <div className="hidden items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] sm:flex">
          <FlaskConical size={15} className="text-violet-500" />
          Built through collaboration
        </div>
      </div>

      {loadError && (
        <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-600">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setLoadError('');
              setReloadKey((value) => value + 1);
            }}
            className="mt-2 font-bold underline"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
              <div className="h-3 w-28 rounded bg-[var(--bg-elevated)]" />
              <div className="mt-4 h-5 w-4/5 rounded bg-[var(--bg-elevated)]" />
              <div className="mt-3 h-16 rounded bg-[var(--bg-elevated)]" />
            </div>
          ))}
        </div>
      ) : investigations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <BookOpen size={22} />
          </div>
          <h3 className="mt-4 text-base font-bold text-[var(--text-main)]">No matching investigations yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-[var(--text-muted)]">
            Try another subject or status, or start a new investigation of your own.
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setLoadError('');
              if (subject === 'All' && status === 'All' && !submittedSearch.trim()) {
                setReloadKey((value) => value + 1);
              }
              setSubject('All');
              setStatus('All');
              setSearch('');
              setSubmittedSearch('');
            }}
            className="mt-4 text-sm font-bold text-violet-600 hover:underline dark:text-violet-400"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {investigations.map((investigation) => (
            <article
              key={investigation.id}
              className="group flex flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition hover:-translate-y-0.5 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-950/5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  {investigation.subject}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[investigation.status]}`}>
                  {labelForStatus(investigation.status)}
                </span>
              </div>
              <Link
                href={`/ideas/${investigation.slug}`}
                className="mt-4 text-lg font-bold leading-snug text-[var(--text-main)] transition group-hover:text-violet-600 dark:group-hover:text-violet-400"
              >
                {investigation.title}
              </Link>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
                {investigation.summary}
              </p>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[var(--text-main)]">
                    Started by {investigation.creator_name || 'A curious mind'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Updated {formatDate(investigation.updated_at)}</p>
                </div>
                <Link
                  href={`/ideas/${investigation.slug}`}
                  aria-label={`Explore ${investigation.title}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-elevated)] text-violet-600 transition group-hover:bg-violet-600 group-hover:text-white dark:text-violet-400"
                >
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creating) setShowCreate(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-idea-title"
            className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-2xl sm:rounded-3xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  <Lightbulb size={13} />
                  New investigation
                </span>
                <h2 id="create-idea-title" className="mt-1 text-xl font-black text-[var(--text-main)]">
                  Put a question in motion
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Start with a clear question and a first testable idea.</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div>
                <label htmlFor="idea-title" className="mb-1.5 block text-xs font-bold text-[var(--text-main)]">Title</label>
                <input
                  id="idea-title"
                  name="title"
                  required
                  maxLength={140}
                  placeholder="What would you like to investigate?"
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-main)]"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="idea-subject" className="mb-1.5 block text-xs font-bold text-[var(--text-main)]">Subject</label>
                  <select
                    id="idea-subject"
                    name="subject"
                    required
                    defaultValue={subjects[0]}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-main)]"
                  >
                    {subjects.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="idea-summary" className="mb-1.5 block text-xs font-bold text-[var(--text-main)]">Short summary</label>
                  <input
                    id="idea-summary"
                    name="summary"
                    required
                    maxLength={500}
                    placeholder="A few sentences to orient collaborators"
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-main)]"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="idea-hypothesis" className="mb-1.5 block text-xs font-bold text-[var(--text-main)]">Working hypothesis</label>
                <textarea
                  id="idea-hypothesis"
                  name="hypothesis"
                  required
                  rows={3}
                  placeholder="What do you currently think might be true?"
                  className="w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-main)]"
                />
              </div>
              <div>
                <label htmlFor="idea-arguments" className="mb-1.5 block text-xs font-bold text-[var(--text-main)]">Reasoning or proposed approach</label>
                <textarea
                  id="idea-arguments"
                  name="proposed_arguments"
                  required
                  rows={4}
                  placeholder="Share the reasoning, evidence, or experiment that could move this forward."
                  className="w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-main)]"
                />
              </div>
              <div>
                <label htmlFor="idea-citations" className="mb-1.5 block text-xs font-bold text-[var(--text-main)]">References <span className="font-normal text-[var(--text-muted)]">(optional)</span></label>
                <textarea
                  id="idea-citations"
                  name="citations"
                  rows={2}
                  placeholder="Links, papers, or other useful sources"
                  className="w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-main)]"
                />
              </div>
              {createError && <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-600">{createError}</p>}
              <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-subtle)] pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                  className="rounded-xl border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {creating ? 'Creating…' : 'Create investigation'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
