'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AtSign,
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  Milestone,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { Notification, NotificationPreferences } from '@/lib/db/types';

const preferenceLabels: { key: keyof Omit<NotificationPreferences, 'user_id'>; label: string; description: string }[] = [
  { key: 'email_notifications', label: 'Email updates', description: 'Receive selected Curio activity by email.' },
  { key: 'in_app_replies', label: 'Replies', description: 'When someone replies to your discussion.' },
  { key: 'in_app_mentions', label: 'Mentions', description: 'When someone mentions or follows you.' },
  { key: 'in_app_invites', label: 'Circle invitations', description: 'Invitations to join a study circle.' },
  { key: 'in_app_reactions', label: 'Reactions', description: 'Reactions to your contributions.' },
];

function notificationIcon(type: Notification['type']) {
  switch (type) {
    case 'reply':
      return MessageCircle;
    case 'mention':
      return AtSign;
    case 'circle_invite':
      return Users;
    case 'reaction':
      return Heart;
    case 'moderation':
      return ShieldCheck;
    case 'milestone':
      return Milestone;
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      const [notificationResponse, preferenceResponse] = await Promise.all([
        fetch('/api/notifications'),
        fetch('/api/notifications/preferences'),
      ]);
      const [notificationData, preferenceData] = await Promise.all([
        notificationResponse.json(),
        preferenceResponse.json(),
      ]);
      if (!notificationResponse.ok) throw new Error(notificationData.error || 'Could not load notifications.');
      if (!preferenceResponse.ok) throw new Error(preferenceData.error || 'Could not load preferences.');
      setError(null);
      setNotifications(notificationData.notifications);
      setPreferences(preferenceData.preferences);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, []);

  async function markRead(id?: string) {
    setError(null);
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : { all: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update notifications.');
      setNotifications((items) => items.map((item) => (!id || item.id === id ? { ...item, is_read: true } : item)));
      window.dispatchEvent(new Event('curio:notifications-updated'));
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Could not update notifications.');
    }
  }

  async function updatePreference(key: keyof Omit<NotificationPreferences, 'user_id'>, value: boolean) {
    if (!preferences) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save preferences.');
      setPreferences(data.preferences);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-r from-violet-500/10 via-sky-500/10 to-emerald-500/10 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-[var(--text-main)]">
            <Bell className="text-violet-600" /> Notifications
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Updates from your people and study circles{unreadCount ? ` · ${unreadCount} unread` : ''}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void markRead()}
          disabled={unreadCount === 0 || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2 text-xs font-bold text-[var(--text-main)] transition hover:bg-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCheck size={15} /> Mark all read
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <section aria-labelledby="activity-heading" className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 id="activity-heading" className="text-sm font-bold text-[var(--text-main)]">Recent activity</h2>
        </div>
        {loading ? (
          <div className="space-y-3 p-5" aria-label="Loading notifications">
            {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-[var(--bg-elevated)]" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Bell className="mx-auto mb-3 text-[var(--text-muted)]" size={26} />
            <p className="font-semibold text-[var(--text-main)]">You&apos;re all caught up</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">New replies, mentions, and circle updates will show up here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {notifications.map((notification) => {
              const Icon = notificationIcon(notification.type);
              return (
                <li key={notification.id} className={`flex gap-3 px-5 py-4 ${notification.is_read ? '' : 'bg-violet-500/[0.04]'}`}>
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={notification.link || '/'}
                      onClick={() => !notification.is_read && void markRead(notification.id)}
                      className="text-sm leading-relaxed text-[var(--text-main)] hover:text-violet-600"
                    >
                      {notification.message}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {notification.sender_name ? `From ${notification.sender_name} · ` : ''}
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <button
                      type="button"
                      onClick={() => void markRead(notification.id)}
                      aria-label="Mark notification as read"
                      className="self-center rounded-lg p-2 text-violet-600 hover:bg-violet-500/10 dark:text-violet-400"
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="preferences-heading" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
          <Settings2 size={17} className="text-[var(--text-muted)]" />
          <h2 id="preferences-heading" className="text-sm font-bold text-[var(--text-main)]">Notification preferences</h2>
        </div>
        <div className="divide-y divide-[var(--border-subtle)] px-5">
          {preferenceLabels.map(({ key, label, description }) => (
            <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-4">
              <span>
                <span className="block text-sm font-semibold text-[var(--text-main)]">{label}</span>
                <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{description}</span>
              </span>
              <input
                type="checkbox"
                checked={preferences?.[key] ?? false}
                disabled={!preferences || saving}
                onChange={(event) => void updatePreference(key, event.target.checked)}
                className="h-4 w-4 shrink-0 accent-violet-600"
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
