'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Users,
  BookOpen,
  Video,
  Layers,
  Lightbulb,
  Bell,
  User,
  ShieldAlert,
  Sparkles,
  Heart,
  Bookmark,
} from 'lucide-react';
import { Profile } from '@/lib/db/types';

interface SidebarProps {
  currentUser: Profile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser }) => {
  const pathname = usePathname();

  const profileHref = currentUser ? `/profile/${currentUser.username}` : '/profile/sophia_curator';

  const navItems = [
    { label: 'Explore', href: '/', icon: Compass },
    { label: 'Communities', href: '/communities', icon: Users },
    { label: 'Library', href: '/library', icon: BookOpen },
    { label: 'Lecture Atlas', href: '/lectures', icon: Video },
    { label: 'Circles', href: '/circles', icon: Layers },
    { label: 'Ideas Lab', href: '/ideas', icon: Lightbulb },
    { label: 'Notifications', href: '/notifications', icon: Bell },
    { label: 'Saved', href: '/saved', icon: Bookmark },
    { label: 'Profile', href: profileHref, icon: User },
  ];

  const isStaff = currentUser && (currentUser.role === 'moderator' || currentUser.role === 'admin');

  return (
    <aside className="w-64 shrink-0 hidden lg:block sticky top-20 self-start space-y-6 pb-8">
      {/* Primary navigation */}
      <nav className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2.5 shadow-xs space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href) && item.href !== '/';

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[var(--curio-coral)]/10 text-[var(--curio-coral)] font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-[var(--curio-coral)]' : ''} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {isStaff && (
          <Link
            href="/moderation"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              pathname.startsWith('/moderation')
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold'
                : 'text-rose-600/80 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20'
            }`}
          >
            <ShieldAlert size={18} />
            <span>Moderation Desk</span>
          </Link>
        )}
      </nav>

      {/* Curio Community Philosophy Callout */}
      <div className="rounded-2xl border border-[var(--curio-coral)]/20 bg-gradient-to-br from-[var(--curio-coral)]/[0.06] via-[var(--curio-violet)]/[0.06] to-[var(--curio-yellow)]/[0.08] p-4.5 space-y-2">
        <div className="flex items-center gap-2 text-[var(--curio-coral)] font-bold text-xs uppercase tracking-wider">
          <Sparkles size={14} />
          <span>The Curio Credo</span>
        </div>
        <p className="text-xs text-[var(--text-main)] font-medium leading-relaxed italic">
          &ldquo;Discover something fascinating. Find your people. Explore the question. Share what you learn.&rdquo;
        </p>
        <div className="pt-1 text-3xs text-[var(--text-muted)] flex items-center gap-1 font-semibold">
          <span>100% Human Knowledge</span>
          <span>•</span>
          <span>Zero AI Bots</span>
        </div>
      </div>
    </aside>
  );
};
