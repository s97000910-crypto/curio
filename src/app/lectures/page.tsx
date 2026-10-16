'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  Clock3,
  ExternalLink,
  Filter,
  GraduationCap,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { Lecture } from '@/lib/db/types';

const subjects = ['All', 'Mathematics', 'Physics', 'Computer Science', 'Philosophy'];
const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

export default function LecturesPage() {
  const router = useRouter();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [subject, setSubject] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadLectures = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const params = new URLSearchParams();
    if (subject !== 'All') params.set('subject', subject);
    if (difficulty !== 'All') params.set('difficulty', difficulty);
    if (debouncedSearch) params.set('search', debouncedSearch);
    try {
      const response = await fetch(`/api/lectures?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load lectures.');
      setLectures(data.lectures || []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load lectures.');
      setLectures([]);
    } finally {
      setLoading(false);
    }
  }, [subject, difficulty, debouncedSearch]);

  useEffect(() => {
    void Promise.resolve().then(loadLectures);
  }, [loadLectures]);

  const submitSuggestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuggesting(true);
    setSuggestError('');
    const form = new FormData(event.currentTarget);
    const durationValue = String(form.get('duration_mins') || '').trim();
    try {
      const response = await fetch('/api/lectures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.get('title'),
          instructor: form.get('instructor'),
          institution: form.get('institution'),
          subject: form.get('subject'),
          subtopic: form.get('subtopic'),
          difficulty_level: form.get('difficulty_level'),
          duration_mins: durationValue ? Number(durationValue) : undefined,
          original_url: form.get('original_url'),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not suggest this lecture.');
      setShowSuggest(false);
      router.push(`/lectures/${data.lecture.id}`);
    } catch (error) {
      setSuggestError(error instanceof Error ? error.message : 'Could not suggest this lecture.');
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-gradient-to-br from-sky-500/10 via-violet-500/10 to-emerald-500/10 p-6 sm:p-8">
        <div className="absolute -right-8 -top-12 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
              <GraduationCap size={14} />
              Learn at your own pace
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-main)] sm:text-4xl">
              The lecture hall
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">
              Find thoughtful lessons from curious teachers, keep notes as you go, and build a learning
              habit one idea at a time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSuggestError('');
              setShowSuggest(true);
            }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700"
          >
            <Plus size={17} />
            Suggest a lecture
          </button>
        </div>
        <div className="relative mt-7 grid grid-cols-2 gap-3 border-t border-[var(--border-subtle)]/70 pt-5 sm:max-w-lg">
          <div>
            <div className="text-xl font-black text-[var(--text-main)]">{lectures.length}</div>
            <div className="text-xs text-[var(--text-muted)]">lessons in this view</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-main)]">
              <Sparkles size={15} className="text-amber-500" />
              Your next big idea
            </div>
            <div className="mt-0.5 text-xs text-[var(--text-muted)]">is a play button away</div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="mr-1 hidden items-center gap-1 text-xs font-semibold text-[var(--text-muted)] sm:flex">
              <Filter size={14} /> Subject
            </span>
            {subjects.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSubject(item)}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  subject === item
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1 sm:min-w-64">
              <span className="sr-only">Search lectures</span>
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search lectures, teachers, schools..."
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-main)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-sky-500/60"
              />
            </label>
            <label className="sr-only" htmlFor="lecture-difficulty">Difficulty</label>
            <select
              id="lecture-difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500/60"
            >
              {difficulties.map((item) => <option key={item} value={item}>{item === 'All' ? 'Any level' : item}</option>)}
            </select>
          </div>
        </div>

        {loadError && (
          <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-600">
            {loadError}
          </div>
        )}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-56 animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]" />
            ))}
          </div>
        ) : lectures.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] px-6 py-14 text-center">
            <BookOpen className="mx-auto mb-3 text-[var(--text-muted)]" size={26} />
            <h2 className="font-bold text-[var(--text-main)]">No lectures found</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Try another search or suggest a lesson for the community.</p>
            <button type="button" onClick={() => setShowSuggest(true)} className="mt-4 text-sm font-bold text-sky-600 hover:underline">
              Suggest a lecture
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {lectures.map((lecture) => (
              <article
                key={lecture.id}
                className="group flex min-h-56 flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition hover:-translate-y-0.5 hover:border-sky-500/30 hover:shadow-lg hover:shadow-sky-950/5"
              >
                <div>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                      {lecture.subject}
                    </span>
                    {lecture.is_completed && (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Completed</span>
                    )}
                  </div>
                  <Link href={`/lectures/${lecture.id}`} className="text-lg font-bold leading-snug text-[var(--text-main)] transition group-hover:text-sky-700 dark:group-hover:text-sky-300">
                    {lecture.title}
                  </Link>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    {lecture.instructor}{lecture.institution ? ` · ${lecture.institution}` : ''}
                  </p>
                  {lecture.subtopic && <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">{lecture.subtopic}</p>}
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span>{lecture.difficulty_level}</span>
                    {lecture.duration_mins && <span className="inline-flex items-center gap-1"><Clock3 size={13} />{lecture.duration_mins} min</span>}
                  </div>
                  <Link href={`/lectures/${lecture.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 dark:text-sky-300">
                    Open lesson <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showSuggest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowSuggest(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="suggest-title" className="my-auto w-full max-w-xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-2xl sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 id="suggest-title" className="text-xl font-black text-[var(--text-main)]">Share a great lecture</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Add a lesson you think other curious minds will love.</p>
              </div>
              <button type="button" aria-label="Close form" onClick={() => setShowSuggest(false)} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"><X size={18} /></button>
            </div>
            <form onSubmit={submitSuggestion} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Lecture title" name="title" required placeholder="e.g. The beauty of numbers" />
                <Field label="Instructor" name="instructor" required placeholder="Instructor or speaker" />
                <Field label="Institution" name="institution" placeholder="University, channel, or independent" />
                <Field label="Subtopic" name="subtopic" placeholder="A more specific topic (optional)" />
                <label className="block text-xs font-semibold text-[var(--text-muted)]">
                  Subject
                  <select name="subject" defaultValue="Mathematics" className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-main)]">
                    {subjects.slice(1).map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-[var(--text-muted)]">
                  Difficulty
                  <select name="difficulty_level" defaultValue="Beginner" className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-main)]">
                    {difficulties.slice(1).map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <Field label="Duration (minutes)" name="duration_mins" type="number" min="1" placeholder="Optional" />
                <Field label="Video or lecture URL" name="original_url" type="url" required placeholder="https://..." />
              </div>
              {suggestError && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{suggestError}</p>}
              <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-subtle)] pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowSuggest(false)} className="rounded-xl border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">Cancel</button>
                <button type="submit" disabled={suggesting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60">
                  {suggesting ? 'Sharing…' : 'Share lecture'} <ExternalLink size={15} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function Field({ label, name, type = 'text', required = false, placeholder, min }: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: string;
}) {
  return (
    <label className="block text-xs font-semibold text-[var(--text-muted)]">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        min={min}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] focus:border-sky-500/60"
      />
    </label>
  );
}
