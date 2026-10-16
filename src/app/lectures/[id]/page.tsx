import { Suspense } from 'react';
import LectureDetailClient from './LectureDetailClient';

export default function LectureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl animate-pulse py-14 text-center text-sm text-[var(--text-muted)]">Preparing your lecture…</div>}>
      <LecturePageContent params={params} />
    </Suspense>
  );
}

async function LecturePageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LectureDetailClient id={id} />;
}
