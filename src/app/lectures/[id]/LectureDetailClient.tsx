'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  MessageSquareText,
  Play,
  Send,
  UserRound,
} from 'lucide-react';
import { Lecture, LectureNote } from '@/lib/db/types';

export default function LectureDetailClient({ id }: { id: string }) {
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [notes, setNotes] = useState<LectureNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [completionBusy, setCompletionBusy] = useState(false);
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [noteText, setNoteText] = useState('');
  const [timestamp, setTimestamp] = useState('0');

  const loadNotes = useCallback(async () => {
    const response = await fetch(`/api/lectures/${encodeURIComponent(id)}/notes`);
    const data = await response.json();
    if (response.ok) setNotes(data.notes || []);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setPageError('');
      try {
        const [lectureResponse, notesResponse] = await Promise.all([
          fetch('/api/lectures'),
          fetch(`/api/lectures/${encodeURIComponent(id)}/notes`),
        ]);
        const [lectureData, notesData] = await Promise.all([lectureResponse.json(), notesResponse.json()]);
        if (!lectureResponse.ok) throw new Error(lectureData.error || 'Could not load lecture.');
        const found = (lectureData.lectures as Lecture[] | undefined)?.find((item) => item.id === id) || null;
        if (!found) throw new Error('We could not find this lecture. It may have been removed or is not available yet.');
        if (!cancelled) {
          setLecture(found);
          setNotes(notesData.notes || []);
        }
      } catch (error) {
        if (!cancelled) setPageError(error instanceof Error ? error.message : 'Could not load lecture.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [id]);

  const toggleCompletion = async () => {
    if (!lecture || completionBusy) return;
    setCompletionBusy(true);
    try {
      const response = await fetch(`/api/lectures/${encodeURIComponent(lecture.id)}/complete`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update completion.');
      setLecture({ ...lecture, is_completed: data.completed });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not update completion.');
    } finally {
      setCompletionBusy(false);
    }
  };

  const addNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!noteText.trim()) return;
    setNoteBusy(true);
    setNoteError('');
    try {
      const response = await fetch(`/api/lectures/${encodeURIComponent(id)}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestampSecs: Math.max(0, Number(timestamp) || 0), note: noteText.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save your note.');
      setNotes((current) => [...current, data.note].sort((a, b) => a.timestamp_secs - b.timestamp_secs));
      setNoteText('');
      await loadNotes();
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Could not save your note.');
    } finally {
      setNoteBusy(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-5xl animate-pulse py-14 text-center text-sm text-[var(--text-muted)]">Preparing your lecture…</div>;
  }

  if (!lecture) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600"><Play size={24} /></div>
        <h1 className="text-2xl font-black text-[var(--text-main)]">Lecture not found</h1>
        <p role="alert" className="text-sm text-[var(--text-muted)]">{pageError || 'This lesson is not available.'}</p>
        <Link href="/lectures" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700">
          <ArrowLeft size={15} /> Browse lectures
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5">
      <Link href="/lectures" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-main)]">
        <ArrowLeft size={15} /> All lectures
      </Link>
      {pageError && <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-600">{pageError}</div>}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">{lecture.subject}</span>
              <span className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)]">{lecture.difficulty_level}</span>
              {lecture.subtopic && <span className="text-xs text-[var(--text-muted)]">{lecture.subtopic}</span>}
            </div>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-[var(--text-main)] sm:text-4xl">{lecture.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5"><UserRound size={15} />{lecture.instructor}</span>
              {lecture.institution && <span>{lecture.institution}</span>}
              {lecture.duration_mins && <span className="inline-flex items-center gap-1.5"><Clock3 size={15} />{lecture.duration_mins} minutes</span>}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-black shadow-lg">
            {lecture.embed_url ? (
              <iframe
                src={lecture.embed_url}
                title={`Lecture: ${lecture.title}`}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-center text-white">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10"><Play size={25} /></div>
                <p className="max-w-sm text-sm text-white/75">This lecture is hosted on its original platform.</p>
                <a href={lecture.original_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100">
                  Watch lecture <ExternalLink size={15} />
                </a>
              </div>
            )}
          </div>
          {lecture.embed_url && (
            <a href={lecture.original_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300">
              Open on the original platform <ExternalLink size={13} />
            </a>
          )}

          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <FileText size={15} /> About this lesson
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-main)]">
              {lecture.subtopic || `A ${lecture.difficulty_level.toLowerCase()} ${lecture.subject.toLowerCase()} lecture by ${lecture.instructor}.`}
            </p>
            {lecture.prerequisites && (
              <div className="mt-4 rounded-xl bg-[var(--bg-elevated)] p-3 text-sm">
                <span className="font-bold text-[var(--text-main)]">Before you start: </span>
                <span className="text-[var(--text-muted)]">{lecture.prerequisites}</span>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className={`rounded-2xl border p-5 ${lecture.is_completed ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              {lecture.is_completed ? <CheckCircle2 size={21} /> : <Check size={21} />}
            </div>
            <h2 className="mt-3 font-bold text-[var(--text-main)]">{lecture.is_completed ? 'Lesson completed' : 'Keep track of your progress'}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">
              {lecture.is_completed ? 'Nice work. You can update your progress any time.' : 'Mark this lesson complete when you have finished it.'}
            </p>
            <button
              type="button"
              disabled={completionBusy}
              onClick={toggleCompletion}
              className={`mt-4 w-full rounded-xl px-3 py-2.5 text-sm font-bold transition disabled:opacity-60 ${lecture.is_completed ? 'border border-emerald-500/20 bg-[var(--bg-card)] text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            >
              {completionBusy ? 'Saving…' : lecture.is_completed ? 'Mark as in progress' : 'Mark as complete'}
            </button>
          </section>
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            <div className="flex items-center gap-2">
              <MessageSquareText size={17} className="text-violet-600" />
              <h2 className="font-bold text-[var(--text-main)]">Notes as you learn</h2>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">Save a thought and pin it to the moment it clicked.</p>
            <form onSubmit={addNote} className="mt-4 space-y-2.5">
              <label className="block text-xs font-semibold text-[var(--text-muted)]">
                Timestamp <span className="font-normal">(seconds)</span>
                <input
                  type="number"
                  min="0"
                  value={timestamp}
                  onChange={(event) => setTimestamp(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-violet-500/60"
                />
              </label>
              <label className="block text-xs font-semibold text-[var(--text-muted)]">
                Your note
                <textarea
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  rows={3}
                  required
                  placeholder="Capture an insight, question, or useful detail…"
                  className="mt-1 w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] focus:border-violet-500/60"
                />
              </label>
              {noteError && <p role="alert" className="text-xs text-rose-600">{noteError}</p>}
              <button type="submit" disabled={noteBusy || !noteText.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50">
                <Send size={14} />{noteBusy ? 'Saving…' : 'Save note'}
              </button>
            </form>
          </section>
        </aside>
      </section>

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-main)]">Your lecture notes</h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{notes.length} {notes.length === 1 ? 'note' : 'notes'} · ordered by timestamp</p>
          </div>
          <MessageSquareText size={19} className="text-violet-600" />
        </div>
        {notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-subtle)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            No notes yet. Add your first thought from the panel above.
          </div>
        ) : (
          <ol className="divide-y divide-[var(--border-subtle)]">
            {notes.map((note) => (
              <li key={note.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <div className="mt-0.5 h-fit shrink-0 rounded-lg bg-violet-500/10 px-2.5 py-1 font-mono text-xs font-bold text-violet-700 dark:text-violet-300">
                  {formatTimestamp(note.timestamp_secs)}
                </div>
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-main)]">{note.note}</p>
                  <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                    {note.user_name || 'Learner'}{note.created_at ? ` · ${new Date(note.created_at).toLocaleDateString()}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

function formatTimestamp(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}
