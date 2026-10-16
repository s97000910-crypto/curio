import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/services/auth';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

export async function AppChrome({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) return <AuthPanel />;

  return (
    <>
      <Navbar currentUser={currentUser} />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 lg:pb-8 flex gap-8">
        <Sidebar currentUser={currentUser} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <MobileNav currentUser={currentUser} />
    </>
  );
}
