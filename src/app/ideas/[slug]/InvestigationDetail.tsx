'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  MessageCircle,
  PencilLine,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Investigation, InvestigationComment, InvestigationRevision, InvestigationStatus } from '@/lib/db/types';
import { MathRenderer } from '@/components/ui/MathRenderer';

const statuses: { value: InvestigationStatus; label: string; className: string }[] = [
  { value: 'exploring', label: 'Exploring', className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  { value: 'seeking_collaborators', label: 'Seeking collaborators', className: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },
  { value: 'under_discussion', label: 'Under discussion', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { value: 'needs_verification', label: 'Needs verification', className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  { value: 'resolved', label: 'Resolved', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { value: 'archived', label: 'Archived', className: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]' },
];

function statusInfo(status: InvestigationStatus) {
  return statuses.find((item) => item.value === status) ?? statuses[0];
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

function initials(name?: string) {
  return (name || 'Curious mind').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export default function InvestigationDetail({
  investigation: initialInvestigation,
  initialComments,
}: {
  investigation: Investigation;
  initialComments: InvestigationComment[];
}) {
  const [investigation, setInvestigation] = useState(initialInvestigation);
  const [comments, setComments] = useState(initialComments);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [savingRevision, setSavingRevision] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [revisionError, setRevisionError] = useState('');
  const [commentError, setCommentError] = useState('');
  const [openRevision, setOpenRevision] = useState<string | null>(null);
  const [revisionSuccess, setRevisionSuccess] = useState(false);
  const [commentText, setCommentText] = useState('');

  const revisions = investigation.revisions ?? [];
  const latestRevision = revisions[0];
  const currentStatus = statusInfo(investigation.status);

  const handleRevision = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRevisionError('');
    setRevisionSuccess(false);
    setSavingRevision(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      hypothesis: String(formData.get('hypothesis') || ''),
      proposed_arguments: String(formData.get('proposed_arguments') || ''),
      citations: String(formData.get('citations') || ''),
      change_summary: String(formData.get('change_summary') || ''),
      status: String(formData.get('status') || investigation.status) as InvestigationStatus,
    };

    try {
      const response = await fetch(`/api/ideas/${encodeURIComponent(investigation.id)}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save your revision.');
      setInvestigation((current) => ({
        ...current,
        status: payload.status,
        updated_at: new Date().toISOString(),
        revisions: [data.revision as InvestigationRevision, ...(current.revisions ?? [])],
      }));
      setShowRevisionForm(false);
      setRevisionSuccess(true);
    } catch (error) {
      setRevisionError(error instanceof Error ? error.message : 'Could not save your revision.');
    } finally {
      setSavingRevision(false);
    }
  };

  const handleComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    setCommentError('');
    setSendingComment(true);
    try {
      const response = await fetch(`/api/ideas/${encodeURIComponent(investigation.id)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not post your comment.');
      setComments((current) => [...current, data.comment as InvestigationComment]);
      setCommentText('');
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : 'Could not post your comment.');
    } finally {
      setSendingComment(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link
        href="/ideas"
        className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] transition hover:text-violet-600 dark:hover:text-violet-400"
      >
        <ArrowLeft size={15} />
        All investigations
      </Link>

      <header className="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              {investigation.subject}
            </span>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${currentStatus.className}`}>
              {currentStatus.label}
            </span>
          </div>
          <h1 className="mt-4 max-w-4xl text-2xl font-black leading-tight tracking-tight text-[var(--text-main)] sm:text-4xl">
            {investigation.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
            {investigation.summary}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <UserRound size={14} />
              Started by <strong className="text-[var(--text-main)]">{investigation.creator_name || 'A curious mind'}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} />
              Updated {formatDate(investigation.updated_at)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpenCheck size={14} />
              {revisions.length} {revisions.length === 1 ? 'revision' : 'revisions'}
            </span>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-5">
          {revisionSuccess && (
            <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <Check size={16} /> Your revision has been added to the investigation.
            </div>
          )}
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400">
                  Current working draft{latestRevision ? ` · v${latestRevision.version_num}` : ''}
                </p>
                <h2 className="mt-1 text-lg font-bold text-[var(--text-main)]">Hypothesis & approach</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRevisionError('');
                  setRevisionSuccess(false);
                  setShowRevisionForm((value) => !value);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-bold text-[var(--text-main)] transition hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-400"
              >
                <PencilLine size={14} />
                {showRevisionForm ? 'Close revision' : 'Suggest a revision'}
              </button>
            </div>
            {latestRevision ? (
              <div className="space-y-5 pt-5">
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Working hypothesis</h3>
                  <MathRenderer content={latestRevision.hypothesis} />
                </div>
                <div className="border-t border-[var(--border-subtle)] pt-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Reasoning & proposed arguments</h3>
                  <MathRenderer content={latestRevision.proposed_arguments} />
                </div>
                {latestRevision.citations && (
                  <div className="border-t border-[var(--border-subtle)] pt-4">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">References</h3>
                    <MathRenderer content={latestRevision.citations} />
                  </div>
                )}
              </div>
            ) : (
              <p className="pt-5 text-sm text-[var(--text-muted)]">No working draft has been added yet.</p>
            )}
          </section>

          {showRevisionForm && (
            <section className="rounded-2xl border border-violet-500/25 bg-[var(--bg-card)] p-5 sm:p-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-xl bg-violet-500/10 p-2 text-violet-600 dark:text-violet-400"><Sparkles size={17} /></div>
                <div>
                  <h2 className="font-bold text-[var(--text-main)]">Contribute a revision</h2>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Each revision is saved as a new version, preserving the project’s history.</p>
                </div>
              </div>
              <form onSubmit={handleRevision} className="space-y-4">
                <div>
                  <label htmlFor="revision-hypothesis" className="mb-1.5 block text-xs font-bold text-[var(--text-main)]">Updated hypothesis</label>
                  <textarea
                    id="revision-hypothesis"
                    name="hypothesis"
                    required
                    defaultValue={latestRevision?.hypothesis ?? ''}
                    rows={3}
                    className="w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <label htmlFor="revision-arguments" className="mb-1.5 block text-xs font-bold text-[var(--text-main)]">Reasoning & proposed arguments</label>
                  <textarea
                    id="revision-arguments"
                    name="proposed_arguments"
                    defaultValue={latestRevision?.proposed_arguments ?? ''}
                    rows={4}
                    className="w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <label htmlFor="revision-citations" className="mb-1.5 block text-xs font-bold text-[var(--text-main)]">References <span className="font-normal text-[var(--text-muted)]">(optional)</span></label>
                  <textarea
                    id="revision-citations"
                    name="citations"
                    defaultValue={latestRevision?.citations ?? ''}
                    rows={2}
                    className="w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-main)]"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="revision-summary" className="mb-1.5 block text-xs font-bold text-[var(--text-main)]">What changed?</label>
                    <input
                      id="revision-summary"
                      name="change_summary"
                      required
                      maxLength={200}
                      placeholder="Briefly describe this revision"
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-main)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="revision-status" className="mb-1.5 block text-xs font-bold text-[var(--text-main)]">Investigation status</label>
                    <select
                      id="revision-status"
                      name="status"
                      defaultValue={investigation.status}
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-main)]"
                    >
                      {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </div>
                </div>
                {revisionError && <p role="alert" className="text-xs font-medium text-rose-600">{revisionError}</p>}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingRevision}
                    className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700 disabled:opacity-60"
                  >
                    {savingRevision ? 'Saving…' : 'Save new version'}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-7">
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-4">
              <div className="rounded-xl bg-sky-500/10 p-2 text-sky-600 dark:text-sky-400"><MessageCircle size={17} /></div>
              <div>
                <h2 className="font-bold text-[var(--text-main)]">Discussion</h2>
                <p className="text-xs text-[var(--text-muted)]">{comments.length} {comments.length === 1 ? 'comment' : 'comments'} on this investigation</p>
              </div>
            </div>
            <form onSubmit={handleComment} className="mt-4">
              <label htmlFor="investigation-comment" className="sr-only">Add to the discussion</label>
              <textarea
                id="investigation-comment"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Share a question, useful observation, or constructive feedback…"
                className="w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                {commentError ? <p role="alert" className="text-xs text-rose-600">{commentError}</p> : <span className="text-[11px] text-[var(--text-muted)]">Be thoughtful and stay curious.</span>}
                <button
                  type="submit"
                  disabled={sendingComment || !commentText.trim()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  <Send size={13} />
                  {sendingComment ? 'Posting…' : 'Post comment'}
                </button>
              </div>
            </form>
            <div className="mt-5 divide-y divide-[var(--border-subtle)]">
              {comments.length === 0 ? (
                <div className="py-6 text-center">
                  <MessageCircle size={20} className="mx-auto text-[var(--text-muted)]" />
                  <p className="mt-2 text-sm font-semibold text-[var(--text-main)]">Start the conversation</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Your perspective could be the next useful clue.</p>
                </div>
              ) : comments.map((comment) => (
                <article key={comment.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                  {comment.author_avatar ? (
                    <Image src={comment.author_avatar} alt="" width={36} height={36} unoptimized className="h-9 w-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-[11px] font-bold text-violet-600 dark:text-violet-400">
                      {initials(comment.author_name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs font-bold text-[var(--text-main)]">{comment.author_name || 'Curious mind'}</span>
                      <time dateTime={comment.created_at} className="text-[11px] text-[var(--text-muted)]">{formatDate(comment.created_at)}</time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--text-muted)]">{comment.content}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            <h2 className="text-sm font-bold text-[var(--text-main)]">Version history</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">The investigation evolves as the community contributes evidence and ideas.</p>
            {revisions.length === 0 ? (
              <p className="mt-5 text-xs text-[var(--text-muted)]">No revisions recorded yet.</p>
            ) : (
              <ol className="mt-5 space-y-4">
                {revisions.map((revision, index) => {
                  const expanded = openRevision === revision.id;
                  return (
                    <li key={revision.id} className="relative pl-5">
                      {index < revisions.length - 1 && <span aria-hidden="true" className="absolute bottom-[-18px] left-[5px] top-2 w-px bg-[var(--border-subtle)]" />}
                      <span aria-hidden="true" className={`absolute left-0 top-1 h-2.5 w-2.5 rounded-full ring-4 ring-[var(--bg-card)] ${index === 0 ? 'bg-violet-500' : 'bg-[var(--border-subtle)]'}`} />
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-[var(--text-main)]">Version {revision.version_num}</p>
                          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{revision.author_name || 'Contributor'} · {formatDate(revision.created_at)}</p>
                        </div>
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-label={`${expanded ? 'Hide' : 'Show'} version ${revision.version_num} details`}
                          onClick={() => setOpenRevision(expanded ? null : revision.id)}
                          className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-main)]"
                        >
                          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{revision.change_summary}</p>
                      {expanded && (
                        <div className="mt-3 space-y-3 rounded-xl bg-[var(--bg-canvas)] p-3 text-xs">
                          <div><p className="mb-1 font-bold text-[var(--text-main)]">Hypothesis</p><MathRenderer content={revision.hypothesis} /></div>
                          <div><p className="mb-1 font-bold text-[var(--text-main)]">Proposed arguments</p><MathRenderer content={revision.proposed_arguments} /></div>
                          {revision.citations && <div><p className="mb-1 font-bold text-[var(--text-main)]">References</p><MathRenderer content={revision.citations} /></div>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
          <section className="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-5">
            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
              <Sparkles size={16} />
              <h2 className="text-sm font-bold">Make it stronger</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
              Good investigations are open to refinement. Add evidence, note uncertainty, and explain what changed with every new version.
            </p>
            <button
              type="button"
              onClick={() => {
                setRevisionError('');
                setRevisionSuccess(false);
                setShowRevisionForm(true);
              }}
              className="mt-4 text-xs font-bold text-violet-700 underline underline-offset-2 dark:text-violet-300"
            >
              Contribute a revision
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
