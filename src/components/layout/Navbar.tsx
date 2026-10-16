'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, ShieldAlert } from 'lucide-react';
import { AccountMenu } from './AccountMenu';
import { CreatePostModal } from '../ui/CreatePostModal';
import { NotificationCenter } from './NotificationCenter';
import { CurioLogo } from './CurioLogo';
import { Profile } from '@/lib/db/types';

interface NavbarProps {
  currentUser: Profile;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isStaff = currentUser.role === 'moderator' || currentUser.role === 'admin';

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/90 backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-4">
          <Link href="/" aria-label="Curio home" className="shrink-0 transition-transform duration-200 hover:scale-[1.025]">
            <CurioLogo size="small" />
          </Link>

          {/* Central Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 max-w-xl mx-2 hidden md:block relative"
          >
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search inquiries, proofs, lectures, books, people..."
                className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] pl-10 pr-4 py-2.5 text-xs focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--border-focus)]/20 transition-all text-[var(--text-main)]"
              />
            </div>
          </form>

          {/* Action buttons & user menu */}
          <div className="flex items-center gap-1.5 shrink-0 sm:gap-2.5">
            {/* Moderation quick link if staff */}
            {isStaff && (
              <Link
                href="/moderation"
                title="Moderation Center"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition"
              >
                <ShieldAlert size={14} />
                <span className="hidden md:inline">Safety Desk</span>
              </Link>
            )}

            {/* Notifications */}
            <NotificationCenter key={currentUser.id} />

            {/* Create Post Button */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-[var(--curio-coral)] px-2 py-2 text-xs font-bold text-white shadow-md shadow-[var(--curio-coral)]/25 transition-all hover:-translate-y-0.5 hover:brightness-95 hover:shadow-lg sm:px-3.5"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Share Inquiry</span>
            </button>

            {/* User Switcher */}
            <AccountMenu currentUser={currentUser} />
          </div>
        </div>
      </header>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          if (window.location.pathname === '/') {
            window.location.reload();
          } else {
            router.push('/');
          }
        }}
      />
    </>
  );
};
