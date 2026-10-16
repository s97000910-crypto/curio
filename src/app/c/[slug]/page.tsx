import { Suspense } from 'react';
import CommunityDetailClient from './CommunityDetailClient';

export default function CommunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-[var(--text-muted)]">Loading community…</div>}>
      <CommunityPageContent params={params} />
    </Suspense>
  );
}

async function CommunityPageContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CommunityDetailClient slug={slug} />;
}
