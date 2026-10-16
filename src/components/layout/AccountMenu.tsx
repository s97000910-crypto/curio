'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, ChevronDown, LogOut, Moon, Sun, UserRound } from 'lucide-react';
import type { Profile } from '@/lib/db/types';

export function AccountMenu({ currentUser }: { currentUser: Profile }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('curio_theme', isDark ? 'dark' : 'light');
  };

  const signOut = async () => {
    setError(null);
    setIsSigningOut(true);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      if (!response.ok) {
        throw new Error('Could not sign out. Please try again.');
      }
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Could not sign out.');
      setIsSigningOut(false);
    }
  };

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="rounded-xl p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-main)] sm:p-2"
      >
        <Moon size={18} className="block dark:hidden" />
        <Sun size={18} className="hidden text-amber-400 dark:block" />
      </button>

      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Account menu for ${currentUser.display_name}`}
        className="flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] py-1.5 pl-1 pr-1.5 transition hover:border-violet-400 sm:gap-2 sm:pl-1.5 sm:pr-2.5"
      >
        {currentUser.avatar_url ? (
          <img
            src={currentUser.avatar_url}
            alt=""
            className="h-7 w-7 rounded-full object-cover ring-1 ring-violet-500/30"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/15 text-xs font-bold text-violet-700 dark:text-violet-300">
            {currentUser.display_name.charAt(0)}
          </span>
        )}
        <span className="hidden max-w-[100px] truncate text-xs font-semibold sm:inline">
          {currentUser.display_name.split(' ')[0]}
        </span>
        <ChevronDown size={14} className="text-[var(--text-muted)]" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 shadow-2xl"
        >
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5">
            {currentUser.avatar_url ? (
              <img src={currentUser.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600/15 text-sm font-bold text-violet-700 dark:text-violet-300">
                {currentUser.display_name.charAt(0)}
              </span>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{currentUser.display_name}</div>
              <div className="truncate text-xs text-[var(--text-muted)]">@{currentUser.username}</div>
            </div>
          </div>

          <Link
            href={`/profile/${currentUser.username}`}
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium transition hover:bg-[var(--bg-elevated)]"
          >
            <UserRound size={15} />
            Your profile
          </Link>
          <Link
            href="/saved"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium transition hover:bg-[var(--bg-elevated)]"
          >
            <Bookmark size={15} />
            Saved
          </Link>
          {error && <p role="alert" className="px-2.5 py-2 text-xs text-rose-600">{error}</p>}
          <button
            onClick={signOut}
            disabled={isSigningOut}
            role="menuitem"
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-60"
          >
            <LogOut size={15} />
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
