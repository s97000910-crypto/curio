'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Clock3, ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { ModerationAction, Report } from '@/lib/db/types';

type ModerationChoice = 'warning' | 'remove_content' | 'suspend_user' | 'ban_user' | 'dismiss_report';

const statusOptions = ['pending', 'reviewing', 'resolved', 'dismissed', 'all'];

function targetHref(report: Report) {
  switch (report.target_type) {
    case 'user':
      return `/profile/${report.target_id}`;
    case 'resource':
      return `/library/${report.target_id}`;
    case 'circle':
      return `/circles/${report.target_id}`;
    default:
      return '/';
  }
}

function availableActions(report: Report): ModerationChoice[] {
  const options: ModerationChoice[] = ['warning'];
  if (report.target_type === 'post' || report.target_type === 'comment' || report.target_type === 'resource') {
    options.push('remove_content');
  }
  if (report.target_type === 'user') options.push('suspend_user', 'ban_user');
  options.push('dismiss_report');
  return options;
}

function actionLabel(action: ModerationChoice) {
  return {
    warning: 'Issue a warning',
    remove_content: 'Remove reported content',
    suspend_user: 'Suspend user',
    ban_user: 'Ban user',
    dismiss_report: 'Dismiss report',
  }[action];
}

export default function ModerationPage() {
  const [status, setStatus] = useState('pending');
  const [reports, setReports] = useState<Report[]>([]);
  const [auditLog, setAuditLog] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actions, setActions] = useState<Record<string, ModerationChoice>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const loadQueue = useCallback(async () => {
    try {
      const response = await fetch(`/api/moderation/reports?status=${encodeURIComponent(status)}`);
      const data = await response.json();
      if (response.status === 403) {
        setForbidden(true);
        throw new Error(data.error || 'Only moderators and administrators can access this page.');
      }
      if (!response.ok) throw new Error(data.error || 'Could not load the moderation queue.');
      setError(null);
      setForbidden(false);
      setReports(data.reports);
      setAuditLog(data.auditLog);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the moderation queue.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    queueMicrotask(() => void loadQueue());
  }, [loadQueue]);

  async function takeAction(report: Report) {
    const action = actions[report.id] ?? 'warning';
    const reason = reasons[report.id]?.trim() ?? '';
    if (!reason) {
      setError('Add a reason before recording a moderation action.');
      return;
    }
    setBusyId(report.id);
    setError(null);
    try {
      const response = await fetch('/api/moderation/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, action, reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not apply moderation action.');
      await loadQueue();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not apply moderation action.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-500/10 via-orange-500/10 to-amber-500/10 p-6">
        <h1 className="flex items-center gap-2 text-2xl font-black text-[var(--text-main)]">
          <ShieldAlert className="text-rose-600" /> Moderation desk
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Review community reports and keep an auditable record of actions.</p>
      </header>

      {error && (
        <div role="alert" className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${forbidden ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'}`}>
          <AlertTriangle size={17} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {!forbidden && (
        <>
          <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)]">Report queue</h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">{reports.length} report{reports.length === 1 ? '' : 's'} in this view</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
                Status
                <select value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value); }} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2.5 py-2 text-[var(--text-main)]">
                  {statusOptions.map((option) => <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>)}
                </select>
              </label>
            </div>
            {loading ? (
              <div className="space-y-3 p-5" aria-label="Loading reports">
                {[1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl bg-[var(--bg-elevated)]" />)}
              </div>
            ) : reports.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <ShieldCheck className="mx-auto mb-3 text-emerald-500" size={28} />
                <p className="font-semibold text-[var(--text-main)]">No reports in this queue</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">You&apos;re all caught up.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {reports.map((report) => {
                  const available = availableActions(report);
                  const selectedAction = actions[report.id] ?? available[0];
                  return (
                    <li key={report.id} className="space-y-4 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">{report.reason.replaceAll('_', ' ')}</span>
                            <span className="text-xs text-[var(--text-muted)]">{report.target_type} · {report.status}</span>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-main)]">{report.details}</p>
                          <p className="mt-2 text-xs text-[var(--text-muted)]">
                            Reported by {report.reporter_name || 'Community member'} · {new Date(report.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Link href={targetHref(report)} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-violet-600 hover:underline dark:text-violet-400">
                          View target <ExternalLink size={13} />
                        </Link>
                      </div>
                      {report.status !== 'resolved' && report.status !== 'dismissed' && (
                        <div className="grid gap-2 rounded-xl bg-[var(--bg-elevated)] p-3 md:grid-cols-[minmax(150px,0.8fr)_minmax(180px,1.5fr)_auto]">
                          <label className="sr-only" htmlFor={`action-${report.id}`}>Action</label>
                          <select
                            id={`action-${report.id}`}
                            value={selectedAction}
                            onChange={(event) => setActions((current) => ({ ...current, [report.id]: event.target.value as ModerationChoice }))}
                            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-main)]"
                          >
                            {available.map((action) => <option key={action} value={action}>{actionLabel(action)}</option>)}
                          </select>
                          <label className="sr-only" htmlFor={`reason-${report.id}`}>Reason for moderation action</label>
                          <input
                            id={`reason-${report.id}`}
                            value={reasons[report.id] ?? ''}
                            onChange={(event) => setReasons((current) => ({ ...current, [report.id]: event.target.value }))}
                            placeholder="Reason for this action..."
                            className="min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-main)]"
                          />
                          <button
                            type="button"
                            onClick={() => void takeAction(report)}
                            disabled={busyId === report.id}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                          >
                            <Check size={14} /> {busyId === report.id ? 'Saving…' : 'Record action'}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
              <Clock3 size={17} className="text-[var(--text-muted)]" />
              <h2 className="text-sm font-bold text-[var(--text-main)]">Recent audit log</h2>
            </div>
            {auditLog.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">No moderation actions have been recorded.</p>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {auditLog.slice(0, 20).map((action) => (
                  <li key={action.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-[var(--text-main)]">
                      <span className="font-bold">{action.moderator_name || 'Moderator'}</span>
                      {' · '}{action.action.replaceAll('_', ' ')} · {action.target_type} <span className="font-mono text-[var(--text-muted)]">{action.target_id}</span>
                    </p>
                    <time className="text-[11px] text-[var(--text-muted)]">{new Date(action.created_at).toLocaleString()}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
