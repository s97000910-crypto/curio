'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AtSign, Bell, Heart, MessageCircle, Milestone, ShieldCheck, Users, X } from 'lucide-react';
import type { Notification } from '@/lib/db/types';

function notificationIcon(type: Notification['type']) {
  switch (type) {
    case 'reply': return MessageCircle;
    case 'mention': return AtSign;
    case 'circle_invite': return Users;
    case 'reaction': return Heart;
    case 'moderation': return ShieldCheck;
    case 'milestone': return Milestone;
  }
}

export function NotificationCenter() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Notification | null>(null);
  const seenIds = useRef<Set<string> | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async (showToasts: boolean) => {
    const response = await fetch('/api/notifications');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load notifications.');

    const items: Notification[] = data.notifications;
    const previousIds = seenIds.current;
    if (showToasts && previousIds) {
      const newUnread = items.find((item) => !item.is_read && !previousIds.has(item.id));
      if (newUnread) {
        setToast(newUnread);
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        toastTimeout.current = setTimeout(() => setToast(null), 6000);
      }
    }

    seenIds.current = new Set(items.map((item) => item.id));
    setNotifications(items);
    setUnreadCount(data.unread_count);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async (showToasts: boolean) => {
      try {
        if (active) await refresh(showToasts);
      } catch (error) {
        console.error('Failed to refresh notifications:', error);
      }
    };

    void load(false);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, 15000);
    const handleRead = () => void load(false);
    window.addEventListener('curio:notifications-updated', handleRead);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('curio:notifications-updated', handleRead);
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, [refresh]);

  const markRead = async (notification: Notification) => {
    if (notification.is_read) return;
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notification.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update notification.');
      setNotifications((items) => items.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      ));
      setUnreadCount((count) => Math.max(0, count - 1));
      window.dispatchEvent(new Event('curio:notifications-updated'));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const closeToast = () => {
    setToast(null);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="relative rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-main)]"
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          aria-expanded={open}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-[var(--bg-card)] bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl shadow-black/15">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)]">Notifications</h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {unreadCount ? `${unreadCount} new updates` : 'You’re all caught up'}
                </p>
              </div>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400"
              >
                See all
              </Link>
            </div>
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">Your activity will show up here.</p>
            ) : (
              <ul className="max-h-80 divide-y divide-[var(--border-subtle)] overflow-y-auto">
                {notifications.slice(0, 6).map((notification) => {
                  const Icon = notificationIcon(notification.type);
                  return (
                    <li key={notification.id}>
                      <Link
                        href={notification.link || '/notifications'}
                        onClick={() => {
                          void markRead(notification);
                          setOpen(false);
                        }}
                        className={`flex gap-3 px-4 py-3 transition hover:bg-[var(--bg-elevated)] ${notification.is_read ? '' : 'bg-rose-500/[0.035]'}`}
                      >
                        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${notification.type === 'reaction' ? 'bg-rose-500/10 text-rose-500' : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'}`}>
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs leading-relaxed text-[var(--text-main)]">{notification.message}</span>
                          <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                            {notification.sender_name ? `${notification.sender_name} · ` : ''}
                            {new Date(notification.created_at).toLocaleString()}
                          </span>
                        </span>
                        {!notification.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed right-4 top-20 z-[60] w-[min(22rem,calc(100vw-2rem))] animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-[var(--bg-card)] p-4 shadow-2xl shadow-black/15">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
              {(() => {
                const Icon = notificationIcon(toast.type);
                return <Icon size={18} />;
              })()}
            </span>
            <button
              type="button"
              onClick={() => {
                void markRead(toast);
                closeToast();
                router.push(toast.link || '/notifications');
              }}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-500">New activity</span>
              <span className="mt-1 block text-xs leading-relaxed text-[var(--text-main)]">{toast.message}</span>
            </button>
            <button type="button" onClick={closeToast} aria-label="Dismiss notification" className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
