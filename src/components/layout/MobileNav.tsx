'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Users, BookOpen, Layers, Lightbulb, User } from 'lucide-react';
import { Profile } from '@/lib/db/types';

interface MobileNavProps {
  currentUser: Profile | null;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentUser }) => {
  const pathname = usePathname();
  const profileHref = currentUser ? `/profile/${currentUser.username}` : '/profile/sophia_curator';

  const items = [
    { label: 'Explore', href: '/', icon: Compass },
    { label: 'Communities', href: '/communities', icon: Users },
    { label: 'Library', href: '/library', icon: BookOpen },
    { label: 'Circles', href: '/circles', icon: Layers },
    { label: 'Ideas Lab', href: '/ideas', icon: Lightbulb },
    { label: 'Profile', href: profileHref, icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex w-full items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-card)]/95 px-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(41,39,34,0.04)] backdrop-blur-xl sm:px-2 lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href) && item.href !== '/';

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1 text-[9px] font-semibold leading-3 transition sm:text-3xs ${
              isActive
                ? 'text-[var(--curio-coral)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Icon size={18} />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
