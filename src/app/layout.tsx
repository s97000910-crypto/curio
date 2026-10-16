import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { AppChrome } from '@/components/layout/AppChrome';

export const instant = false;

export const metadata: Metadata = {
  title: 'Curio — Ideas, in orbit',
  description:
    'A human-powered home for curious people, surprising discoveries, and ideas worth exploring together.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-sans antialiased bg-[var(--bg-canvas)] text-[var(--text-main)] transition-colors">
        <Suspense
          fallback={
            <>
              <div className="h-16 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]" />
              <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 lg:pb-8" aria-hidden="true">
                <div className="h-8 w-48 rounded-xl bg-[var(--bg-elevated)] animate-pulse" />
                <div className="mt-6 h-72 rounded-3xl bg-[var(--bg-elevated)] animate-pulse" />
              </div>
            </>
          }
        >
          <AppChrome>{children}</AppChrome>
        </Suspense>
      </body>
    </html>
  );
}
