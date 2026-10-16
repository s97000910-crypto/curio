import { Suspense } from 'react';
import CircleDetailClient from './CircleDetailClient';

export default function CircleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl py-14 text-center text-sm text-[var(--text-muted)]">Opening study circle…</div>}>
      <CirclePageContent params={params} />
    </Suspense>
  );
}

async function CirclePageContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CircleDetailClient slug={slug} />;
}
